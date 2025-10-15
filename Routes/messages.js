// routes/chat.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Message = require('../models/messages'); 
const Service_url = process.env.SERVICE_URL

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
        throw err;
    }
}

// router.get('/select', async (req, res) => {
//     const { user_id, receiver_id, max_id } = req.query;

//     if (!user_id || !receiver_id) {
//         return res.status(400).json({ success: false, message: "user_id and receiver_id are required" });
//     }

//     try {

//          const whereClause = {
//             [Op.or]: [
//                 { sender_id: user_id, receiver_id },
//                 { sender_id: receiver_id, receiver_id: user_id }
//             ]
//         };

//         if (max_id && max_id > 0) {
//             whereClause.id = { [Op.lt]: max_id };
//         }

//         const messages = await Message.findAll({
//             where: whereClause,
//             order: [["id", "DESC"]],
//             limit: 16,
//             raw: true
//         });

//         const messagesToReturn = messages.slice(0, 15).reverse().map(msg => {
//             const date = new Date(msg.created_at);
//             const today = new Date();
//             const yesterday = new Date();
//             yesterday.setDate(today.getDate() - 1);

//             const isToday = date.toDateString() === today.toDateString();
//             const isYesterday = date.toDateString() === yesterday.toDateString();
//             const isCurrentYear = date.getFullYear() === today.getFullYear();

//             let formattedTime;

//             if (isToday) {
//                 formattedTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
//             } else if (isYesterday) {
//                 formattedTime = "Yesterday " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
//             } else if (isCurrentYear) {
//                 formattedTime = date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
//             } else {
//                 formattedTime = date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
//             }

//             return {
//                 ...msg,
//                 image: msg.image ? Service_url + msg.image : null,
//                 file: msg.file ? Service_url + msg.file : null,
//                 is_me: parseInt(msg.sender_id) === parseInt(user_id),
//                 created_at: formattedTime,
//                 date_time: msg.created_at
//             };
//         });

//         res.json({ success: true, messages:messagesToReturn });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "Failed to fetch messages", error: err.message });
//     }
// });
router.get('/select', async (req, res) => {
    const { user_id, receiver_id, page = 1 } = req.query;

    if (!user_id || !receiver_id) {
        return res.status(400).json({ success: false, message: "user_id and receiver_id are required" });
    }

    const limit = 16; // messages per page
    const offset = (page - 1) * limit;

    try {
        const whereClause = {
            [Op.or]: [
                { sender_id: user_id, receiver_id },
                { sender_id: receiver_id, receiver_id: user_id }
            ]
        };

        // Get total messages count
        const totalMessages = await Message.count({ where: whereClause });
        const totalPages = Math.ceil(totalMessages / limit);

        // Fetch messages with limit & offset
        const messages = await Message.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            limit,
            offset,
            raw: true
        });

        const messagesToReturn = messages.reverse().map(msg => {
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

        res.json({
            success: true,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                per_page: limit,
                total_messages: totalMessages,
                has_next: parseInt(page) < totalPages,
                has_previous: parseInt(page) > 1
            },
            messages: messagesToReturn
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch messages", error: err.message });
    }
});


module.exports = router;
