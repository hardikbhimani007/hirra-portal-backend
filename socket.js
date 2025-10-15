const { Server } = require("socket.io");
const Message = require("./models/messages");
const User = require("./models/user");
const { Op, Sequelize } = require("sequelize");
const { saveChatMedia } = require('./utils/multerConfig');
const fs = require("fs");
const path = require("path");
const sharp = require('sharp');

const Service_url = process.env.SERVICE_URL || '';

let io;
const userSockets = new Map();
const fileBuffers = new Map();

const formatChatTime = (dateStr) => {
    if (!dateStr) return "";

    const msgDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now - msgDate;

    if (diffMs < 15000) {
        return "Just now";
    }

    const isToday =
        msgDate.getDate() === now.getDate() &&
        msgDate.getMonth() === now.getMonth() &&
        msgDate.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        msgDate.getDate() === yesterday.getDate() &&
        msgDate.getMonth() === yesterday.getMonth() &&
        msgDate.getFullYear() === yesterday.getFullYear();

    if (isToday) {
        return msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday) {
        return "Yesterday";
    } else if (msgDate.getFullYear() === now.getFullYear()) {
        return msgDate.toLocaleDateString([], { day: "2-digit", month: "short" });
    } else {
        return msgDate.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
    }
};

const formatLastSeen = (timestamp) => {
    // if (!timestamp) return "Offline";

    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now - lastSeen;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffDay === 1)
        return `Yesterday at ${lastSeen.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    if (diffDay < 7)
        return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    return lastSeen.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

async function saveMessage({ sender_id, receiver_id, message, image = null, file = null, file_name = null, file_size = null }) {
    return await Message.create({
        sender_id,
        receiver_id,
        message,
        image,
        file,
        file_name,
        file_size,
        is_delivered: receiver_id ? !!userSockets.get(String(receiver_id)) : false,
        is_read: false,
    });
}

async function getMainChatList(user_id) {
    try {
        if (!user_id) return [];

        const chatPartners = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ]
            },
            attributes: [
                [Sequelize.literal(`
            CASE 
                WHEN sender_id = ${user_id} THEN receiver_id
                ELSE sender_id
            END
        `), "chat_user_id"],
                [Sequelize.fn("MAX", Sequelize.col("created_at")), "last_msg_time"]
            ],
            group: ["chat_user_id"],
            raw: true
        });

        const chatUserIds = chatPartners
            .map(cp => cp.chat_user_id)
            .filter(id => id !== user_id);

        if (chatUserIds.length === 0) {
            return [];
        }

        const lastMessagesPromises = chatPartners
            .filter(cp => cp.chat_user_id !== user_id)
            .map(async (cp) => {
                const lastMessage = await Message.findOne({
                    where: {
                        [Op.or]: [
                            { sender_id: user_id, receiver_id: cp.chat_user_id },
                            { sender_id: cp.chat_user_id, receiver_id: user_id }
                        ]
                    },
                    order: [["created_at", "DESC"]],
                    attributes: ["sender_id", "receiver_id", "message", "image", "file", "created_at"],
                    raw: true
                });
                return { chat_user_id: cp.chat_user_id, ...lastMessage };
            });

        const lastMessagesResults = await Promise.all(lastMessagesPromises);
        const lastMessages = lastMessagesResults.filter(msg => msg.sender_id);

        const unreadCounts = await Message.findAll({
            where: {
                sender_id: chatUserIds,
                receiver_id: user_id,
                is_read: false
            },
            attributes: [
                "sender_id",
                [Sequelize.fn("COUNT", Sequelize.col("id")), "unread_count"]
            ],
            group: ["sender_id"],
            raw: true
        });

        const users = await User.findAll({
            where: { id: chatUserIds },
            attributes: ["id", "name", "profile_pictures", "user_type", "is_online", "last_seen_time"],
            raw: true
        });

        const unreadMap = new Map(
            unreadCounts.map(uc => [uc.sender_id, parseInt(uc.unread_count)])
        );
        const userMap = new Map(users.map(u => [u.id, u]));
        const messageMap = new Map(
            lastMessages.map(msg => [msg.chat_user_id, msg])
        );

        const formatMessageDisplay = (message, image, file) => {
            if (image) return "Sent an image";
            if (file) return "Sent a file";
            if (message) {
                return message;
            }
            return "";
        };

        const chatList = chatPartners
            .filter(cp => cp.chat_user_id !== user_id)
            .map(cp => {
                const chatUserId = cp.chat_user_id;
                const user = userMap.get(chatUserId);
                const lastMessage = messageMap.get(chatUserId);
                const unreadCount = unreadMap.get(chatUserId) || 0;

                return {
                    user_id: chatUserId,
                    name: user?.name || `User ${chatUserId}`,
                    profile_pictures: user?.profile_pictures
                        ? `${Service_url}${user.profile_pictures}`
                        : `${Service_url}/default-profile.png`,
                    last_message: formatMessageDisplay(
                        lastMessage?.message,
                        lastMessage?.image,
                        lastMessage?.file
                    ),
                    user_type: user?.user_type || "user",
                    is_online: user.is_online,
                    last_seen_time: formatLastSeen(user.last_seen_time),
                    last_message_image: lastMessage?.image || null,
                    last_message_file: lastMessage?.file || null,
                    last_message_time: formatChatTime(lastMessage?.created_at || cp.last_msg_time),
                    unread_count: unreadCount,
                    date_time: lastMessage.created_at
                };
            })
            .sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

        return chatList;

    } catch (err) {
        console.error("Error fetching main chat list:", err);
        return [];
    }
}

async function emitMainChatList(user_id) {
    const socketId = userSockets.get(String(user_id));
    if (socketId) {
        const chatList = await getMainChatList(user_id);
        io.to(socketId).emit("get_main_chat", chatList);
    }
}

async function getSubChatMessages(user_id, receiver_id, max_id = 0) {
    try {
        const whereClause = {
            [Op.or]: [
                { sender_id: user_id, receiver_id },
                { sender_id: receiver_id, receiver_id: user_id }
            ]
        };

        if (max_id && max_id > 0) {
            whereClause.id = { [Op.lt]: max_id };
        }

        const messages = await Message.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            limit: 16,
            raw: true
        });

        const messagesToReturn = messages.slice(0, 15).reverse().map(msg => {
            const date = new Date(msg.created_at);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            const isToday = date.toDateString() === today.toDateString();
            const isYesterday = date.toDateString() === yesterday.toDateString();
            const isCurrentYear = date.getFullYear() === today.getFullYear();

            let formattedTime;

            if (isToday) {
                formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
            } else if (isYesterday) {
                formattedTime = "Yesterday " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
            } else if (isCurrentYear) {
                formattedTime = date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
            } else {
                formattedTime = date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
            }

            return {
                ...msg,
                image: msg.image ? Service_url + msg.image : null,
                file: msg.file ? Service_url + msg.file : null,
                is_me: parseInt(msg.sender_id) === parseInt(user_id),
                created_at: formattedTime,
                date_time: msg.created_at
            };
        });

        return messagesToReturn;

    } catch (err) {
        console.error("Error fetching sub chat messages:", err);
        return err;
    }
}

async function emitSubChatToReceiver(receiver_id, sender_id) {
    const messages = await getSubChatMessages(receiver_id, sender_id);

    const receiverSocketId = userSockets.get(String(receiver_id));
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("get_sub_chat", messages);
    }

    try {
        const admins = await User.findAll({
            where: { user_type: "admin" },
            attributes: ["id"],
            raw: true
        });

        for (const admin of admins) {
            const adminSocketId = userSockets.get(String(admin.id));
            if (adminSocketId) {
                io.to(adminSocketId).emit("get_sub_chat", messages);
            }
        }
    } catch (err) {
        console.error("Error emitting sub chat to admins:", err);
    }
}

async function getAdminMainChatList() {
    try {
        const pairs = await Message.findAll({
            where: {
                sender_id: { [Op.ne]: null },
                receiver_id: { [Op.ne]: null }
            },
            attributes: [
                [Sequelize.fn("MAX", Sequelize.col("created_at")), "last_msg_time"],
                [Sequelize.literal("LEAST(sender_id, receiver_id)"), "user_a"],
                [Sequelize.literal("GREATEST(sender_id, receiver_id)"), "user_b"]
            ],
            group: ["user_a", "user_b"],
            raw: true
        });

        if (!pairs || pairs.length === 0) return [];

        const lastMessagesPromises = pairs.map(async (pi) => {
            const lastMsg = await Message.findOne({
                where: {
                    [Op.or]: [
                        { sender_id: pi.user_a, receiver_id: pi.user_b },
                        { sender_id: pi.user_b, receiver_id: pi.user_a }
                    ]
                },
                order: [["created_at", "DESC"]],
                attributes: ["id", "sender_id", "receiver_id", "message", "image", "file", "file_name", "created_at"],
                raw: true
            });
            return { lastMsg, user_a: pi.user_a, user_b: pi.user_b, last_msg_time: pi.last_msg_time };
        });

        const lastMessagesResults = await Promise.all(lastMessagesPromises);

        const unreadCounts = await Message.findAll({
            where: {
                is_admin_read: false,
                sender_id: { [Op.ne]: null },
                receiver_id: { [Op.ne]: null }
            },
            attributes: [
                [Sequelize.literal("LEAST(sender_id, receiver_id)"), "user_a"],
                [Sequelize.literal("GREATEST(sender_id, receiver_id)"), "user_b"],
                [Sequelize.fn("COUNT", Sequelize.col("id")), "unread_admin_count"]
            ],
            group: ["user_a", "user_b"],
            raw: true
        });

        const unreadMap = new Map(
            unreadCounts.map(u => [`${u.user_a}-${u.user_b}`, parseInt(u.unread_admin_count, 10)])
        );

        const userIds = new Set();
        lastMessagesResults.forEach(p => { userIds.add(p.user_a); userIds.add(p.user_b); });
        const users = await User.findAll({
            where: { id: Array.from(userIds) },
            attributes: ["id", "name", "profile_pictures"],
            raw: true
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        const formatMessagePreview = (message, image, file) => {
            if (image) return "Sent an image";
            if (file) return "Sent a file";
            if (message) return message;
            return "";
        };

        const result = lastMessagesResults.map(item => {
            const lm = item.lastMsg || {};
            const preview = formatMessagePreview(lm.message, lm.image, lm.file);
            const lastMsgTimeRaw = lm.created_at || item.last_msg_time;
            const unreadKey1 = `${item.user_a}-${item.user_b}`;
            const unreadKey2 = `${item.user_b}-${item.user_a}`;
            const unreadCount = unreadMap.get(unreadKey1) || unreadMap.get(unreadKey2) || 0;

            return {
                user_a_id: item.user_a,
                user_a_name: userMap.get(item.user_a)?.name || `User ${item.user_a}`,
                user_a_profile: userMap.get(item.user_a)?.profile_pictures ? `${Service_url}${userMap.get(item.user_a).profile_pictures}` : `${Service_url}/default-profile.png`,

                user_b_id: item.user_b,
                user_b_name: userMap.get(item.user_b)?.name || `User ${item.user_b}`,
                user_b_profile: userMap.get(item.user_b)?.profile_pictures ? `${Service_url}${userMap.get(item.user_b).profile_pictures}` : `${Service_url}/default-profile.png`,

                last_message: preview,
                last_message_sender_id: lm.sender_id || null,
                last_message_image: lm.image ? `${Service_url}${lm.image}` : null,
                last_message_file: lm.file ? `${Service_url}${lm.file}` : null,
                last_message_time: formatChatTime(lastMsgTimeRaw),
                unread_admin_count: unreadCount,
                date_time: lastMsgTimeRaw
            };
        });

        result.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

        return result;

    } catch (err) {
        console.error("Error fetching admin main chat list:", err);
        return [];
    }
}

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        maxHttpBufferSize: 150 * 1024 * 1024
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("register", async (user_id) => {
            console.log(`Registering user_id ${user_id} with socket ${socket.id}`);
            userSockets.set(user_id, socket.id);
            io.emit("user_connected", user_id);

            try {
                await User.update(
                    { is_online: true },
                    { where: { id: user_id } }
                );

                await Message.update(
                    { is_delivered: true },
                    {
                        where: {
                            receiver_id: user_id,
                            is_delivered: false,
                        },
                    }
                );
                console.log(`Marked undelivered messages as delivered for user ${user_id}`);
            } catch (err) {
                console.error("Error updating undelivered messages:", err);
            }
        });

        socket.on("get_sub_chat", async ({ user_id, receiver_id, max_id = 0 }) => {
            try {
                // userActiveChats.set(String(user_id), receiver_id);

                const messages = await getSubChatMessages(user_id, receiver_id, max_id);
                socket.emit("get_sub_chat", messages);
            } catch (err) {
                console.error("Error fetching chat:", err);
                socket.emit("error", { message: "Failed to fetch chat history" });
            }
        });

        socket.on("get_main_chat", async ({ user_id }) => {
            try {
                const chatList = await getMainChatList(user_id);
                socket.emit("get_main_chat", chatList);
            } catch (err) {
                console.error("Error fetching main chat:", err);
                socket.emit("error", { message: "Failed to fetch main chat" });
            }
        });

        socket.on("get_admin_main_chat", async ({ } = {}) => {
            try {
                const list = await getAdminMainChatList();
                socket.emit("get_admin_main_chat", list);
            } catch (err) {
                console.error("Error handling get_admin_main_chat:", err);
                socket.emit("error", { message: "Failed to fetch admin chat list" });
            }
        });

        socket.on("mark_conversation_read", async ({ user_a_id, user_b_id }) => {
            try {
                if (!user_a_id || !user_b_id) return;
                const aId = parseInt(user_a_id);
                const bId = parseInt(user_b_id);
                await Message.update(
                    { is_admin_read: 1 },
                    {
                        where: {
                            [Op.and]: [
                                { is_admin_read: 0 },
                                {
                                    [Op.or]: [
                                        { sender_id: aId, receiver_id: bId },
                                        { sender_id: bId, receiver_id: aId }
                                    ]
                                }
                            ]
                        }
                    }
                );

                const messages = await getSubChatMessages(user_a_id, user_b_id);
                socket.emit("get_sub_chat", messages);
                const mainChatList = await getAdminMainChatList();
                io.emit("get_admin_main_chat", mainChatList);

            } catch (err) {
                console.error("Error marking conversation as read:", err);
                socket.emit("error", { message: "Failed to mark conversation as read" });
            }
        });

        socket.on("send_message", async ({ sender_id, receiver_id, message, image, file }) => {
            try {
                if (!sender_id || (!message && !image && !file)) return;
                let imagePath = null;
                let filePath = null;

                if (image && image.startsWith('data:image/')) {
                    imagePath = await saveChatMedia(image);
                }
                if (file && !file.startsWith('data:image/')) {
                    filePath = await saveChatMedia(file);
                }

                await saveMessage({
                    sender_id,
                    receiver_id,
                    message,
                    image: imagePath,
                    file: filePath
                });

                await emitSubChatToReceiver(sender_id, receiver_id);
                await emitMainChatList(sender_id);
                const mainChatList = await getAdminMainChatList();
                await io.emit("get_admin_main_chat", mainChatList);

                if (receiver_id) {
                    await emitSubChatToReceiver(receiver_id, sender_id);
                    await emitMainChatList(receiver_id);
                }

            } catch (err) {
                console.error("Error sending message:", err);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        socket.on("read_message", async ({ sender_id, receiver_id }) => {
            try {
                if (!sender_id || !receiver_id) return;

                await Message.update(
                    { is_read: true },
                    {
                        where: {
                            sender_id: sender_id,
                            receiver_id: receiver_id,
                            is_read: false
                        }
                    }
                );

                console.log(`Marked messages from ${sender_id} to ${receiver_id} as read`);

                await emitSubChatToReceiver(receiver_id, sender_id);
                await emitSubChatToReceiver(sender_id, receiver_id);
                await emitMainChatList(receiver_id);
                await emitMainChatList(sender_id);

                socket.emit("messages_marked_read", { sender_id, receiver_id });

            } catch (err) {
                console.error("Error marking messages as read:", err);
                socket.emit("error", { message: "Failed to mark messages as read" });
            }
        });

        socket.on("typing", ({ sender_id, receiver_id, is_typing }) => {
            if (!receiver_id) return;

            const receiverSocketId = userSockets.get(String(receiver_id));
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("typing", {
                    sender_id,
                    is_typing
                });
            }
        });

        socket.on("file_chunk", async ({ sender_id, receiver_id, fileName, filesize, chunk, isLast }) => {
            const uploadDir = path.join(__dirname, "uploads", "chat_files");
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            if (!fileBuffers.has(fileName)) {
                const timestamp = Date.now();
                const timestampedName = `${timestamp}-${fileName}`;
                const savedPath = path.join(uploadDir, timestampedName);
                fileBuffers.set(fileName, savedPath);
            }

            const savedPath = fileBuffers.get(fileName);
            fs.appendFileSync(savedPath, Buffer.from(chunk, "base64"));

            if (isLast) {
                let relativePath;
                let isImage = fileName.match(/\.(png|jpg|jpeg|gif)$/i);

                if (isImage) {
                    const webpName = `${Date.now()}-${path.parse(fileName).name}.webp`;
                    const webpPath = path.join(uploadDir, webpName);

                    try {
                        await sharp(savedPath)
                            .resize({ width: 800, withoutEnlargement: true })
                            .webp({ quality: 70 })
                            .toFile(webpPath);

                        fs.unlinkSync(savedPath);

                        relativePath = `/uploads/chat_files/${webpName}`;
                    } catch (err) {
                        console.error("WebP conversion failed:", err);
                        relativePath = `/uploads/chat_files/${path.basename(savedPath)}`;
                    }
                } else {
                    relativePath = `/uploads/chat_files/${path.basename(savedPath)}`;
                }

                await saveMessage({
                    sender_id,
                    receiver_id,
                    message: "",
                    image: isImage ? relativePath : null,
                    file: !isImage ? relativePath : null,
                    file_name: fileName,
                    file_size: filesize
                });

                await emitSubChatToReceiver(sender_id, receiver_id);
                await emitMainChatList(sender_id);
                await emitSubChatToReceiver(receiver_id, sender_id);
                await emitMainChatList(receiver_id);

                fileBuffers.delete(fileName);
            }
        });

        socket.on("search_main_chat", async ({ user_id, search_text }) => {
            if (!user_id) return;

            try {
                const chatList = await getMainChatList(user_id);

                const filtered = chatList.filter(chat =>
                    chat.name.toLowerCase().includes(search_text.toLowerCase())
                );

                socket.emit("search_main_chat_result", filtered);
            } catch (err) {
                console.error("Error searching main chat:", err);
                socket.emit("search_main_chat_result", []);
            }
        });

        socket.on("search_admin_main_chat", async ({ user_id, search_text }) => {
            try {
                if (!user_id || !search_text) {
                    socket.emit("search_main_chat_result", []);
                    return;
                }

                const chatList = await getAdminMainChatList();
                const lowerSearch = search_text.toLowerCase();

                const filteredList = chatList.filter(chat => {
                    const userAName = chat.user_a_name?.toLowerCase() || "";
                    const userBName = chat.user_b_name?.toLowerCase() || "";
                    const lastMsg = (chat.last_message || "").toLowerCase();

                    return (
                        userAName.includes(lowerSearch) ||
                        userBName.includes(lowerSearch) ||
                        lastMsg.includes(lowerSearch)
                    );
                });

                socket.emit("search_main_chat_result", filteredList);

            } catch (err) {
                console.error("Error searching main chat list:", err);
                socket.emit("error", { message: "Failed to search main chat list" });
            }
        });

        socket.on("disconnect", async () => {
            console.log("Client disconnected:", socket.id);
            for (let [user_id, sId] of userSockets.entries()) {
                if (sId === socket.id) {
                    userSockets.delete(user_id);
                    // userActiveChats.delete(user_id);
                    io.emit("user_disconnected", user_id);
                    try {
                        await User.update(
                            {
                                is_online: false,
                                last_seen_time: new Date()
                            },
                            { where: { id: user_id } }
                        );
                        console.log(`User ${user_id} went offline`);
                    } catch (err) {
                        console.error("Error updating offline status:", err);
                    }
                    break;
                }
            }
        });
    });

    return { io, userSockets };
}

module.exports = { initSocket, userSockets };