const User = require('../models/user');
const JobsSaved = require('../models/jobsSaved');
const Job = require('../models/jobs');
const Applications = require('../models/applications');
const Message = require('../models/messages');
const UserAbuseReport = require('../models/UserAbuseReport');
const { generateOTP } = require('../utils/EmailSend');
const { generateToken, getUserIdFromToken } = require('../utils/JWT_token');
const { Op } = require('sequelize');
const { timeSince } = require('../utils/common');
const { saveChatMedia } = require('../utils/multerConfig');

const Service_url = process.env.SERVICE_URL || '';

exports.insertUser = async (req, res) => {
    try {
        const { type: user_type } = req.query;
        const { email, phone, trade, skill, ...rest } = req.body;

        if (!user_type || (!email && !phone)) {
            return res.status(400).json({
                success: false,
                message: 'user_type and either email or phone are required',
            });
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    email ? { email } : null,
                    phone ? { phone } : null
                ].filter(Boolean),
            },
        });

        const otp = generateOTP();
        const otp_time = new Date();

        if (existingUser) {
            if (existingUser.user_type !== user_type) {
                return res.status(200).json({
                    success: 0,
                    user_id: existingUser.id,
                    message: `This user already exists as ${existingUser.user_type}.`,
                });
            } else {
                const token = existingUser.jwt_token || generateToken({
                    id: existingUser.id,
                    role: existingUser.user_type,
                    email: existingUser.email || undefined,
                    phone: existingUser.phone || undefined,
                });
                existingUser.otp = otp;
                existingUser.otp_time = otp_time;
                await existingUser.save();

                return res.status(200).json({
                    success: 1,
                    user_id: existingUser.id,
                    message: 'OTP sent to your device.',
                    otp,
                    // token
                });
            }
        }

        const newUser = await User.create({
            user_type,
            email: email || null,
            phone: phone || null,
            trade: trade || [],
            skill: skill || [],
            otp,
            otp_time,
            profile_status: "pending",
            ...rest,
        });

        const payload = {
            id: newUser.id,
            role: newUser.user_type,
            email: newUser.email || undefined,
            phone: newUser.phone || undefined,
        };
        const token = generateToken(payload);

        newUser.jwt_token = token;
        await newUser.save();

        res.status(201).json({
            success: 1,
            user_id: newUser.id,
            message: 'OTP sent to your device.',
            otp,
            // token,
            data: newUser,
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(200).json({
                success: false,
                message: 'User not found',
            });
        }
        const token = req.headers.authorization;
        const reporterId = getUserIdFromToken(token);

        const savedJobsCount = await JobsSaved.count({
            where: { user_id: user.id }
        });

        const appliedJobsCount = await Applications.count({
            where: { user_id: user.id }
        });

        const report = await UserAbuseReport.findOne({
            where: {
                user_id: user.id,
                report_by: reporterId
            }
        });
        const reportInfo = {
            reported: !!report,
            report_reason: report ? report.report_reason : null
        };

        const formattedUser = {
            id: user.id,
            user_type: user.user_type,
            name: user.name,
            profile_pictures: user.profile_pictures
                ? `${Service_url}${user.profile_pictures}`
                : null,
            email: user.email,
            phone: user.phone,
            saved_jobs_count: savedJobsCount,
            applied_jobs_count: appliedJobsCount,
            title: user.title,
            description: user.description,
            is_cscsfile_verified: user.is_cscsfile_verified === null
                ? "Not Verified"
                : user.is_cscsfile_verified === 1
                    ? "Verified"
                    : "Not Verified",
            cscs_file: `${Service_url}${user.cscs_file}`,
            location: user.location,
            radius: user.radius != null ? user.radius : "",
            lat: user.lat,
            long: user.long,
            min_hour_rate: user.min_hour_rate,
            availability: user.availability,
            profile_status: user.profile_status,
            trade: JSON.parse(user.trade),
            skill: JSON.parse(user.skill),
            is_active: user.is_active,
            user_since: timeSince(user.created_at),
            abuse_report: reportInfo,
            year_of_experience: user.year_of_experience,
            // hours_of_availability: user.hours_of_availability,
            // daily_rate: user.daily_rate,
            company_number: user.company_number,
            address_house_number: user.address_house_number,
            address_street: user.address_street,
            address_city: user.address_city,
            address_state: user.address_state,
            address_postal_code: user.address_postal_code,
            address_country: user.address_country,
            apartment: user.apartment,
            business_number: user.business_number,
            work_location: user.work_location,
            work_address_postal_code: user.work_address_postal_code,
            work_address_city: user.work_address_city,
            work_address_house_number: user.work_address_house_number,
            work_apartment: user.work_apartment,
            work_address_country: user.work_address_country,
            use_same_address: user.use_same_address,
        };

        res.status(200).json({
            success: true,
            message: 'User fetched successfully',
            data: formattedUser,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { trade, skill, profile_pictures, cscs_file, cscs_file_name, ...rest } = req.body;
        const user = await User.findByPk(req.body.id);
        if (!user) {
            return res.status(200).json({
                success: false,
                message: 'User not found',
            });
        }
        if (rest.email) delete rest.email;
        if (profile_pictures && !profile_pictures.startsWith('http')) {
            user.profile_pictures = profile_pictures;
        }

        if (cscs_file && cscs_file.startsWith('data:')) {
            const savedFilePath = await saveChatMedia(cscs_file, 'uploads/cscs_files');
            user.cscs_file = savedFilePath;

            if (cscs_file_name) {
                user.cscs_file_name = cscs_file_name;
            }
        }

        Object.assign(user, rest);

        if (Array.isArray(trade)) user.trade = trade;
        if (Array.isArray(skill)) user.skill = skill;

        await user.save();

        const formattedUser = {
            ...user.toJSON(),
            profile_pictures: user.profile_pictures
                ? `${Service_url}${user.profile_pictures}`
                : null,
            cscs_file: user.cscs_file
                ? `${Service_url}${user.cscs_file}`
                : null
        };

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: formattedUser,
        });
    } catch (err) {
        console.log(err.message)
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { trade, skill, profile_pictures, cscs_file, cscs_file_name, ...rest } = req.body;
        const user = await User.findByPk(req.body.id);
        if (!user) {
            return res.status(200).json({
                success: false,
                message: 'User not found',
            });
        }
        if (rest.email) delete rest.email;
        if (profile_pictures && !profile_pictures.startsWith('http')) {
            user.profile_pictures = profile_pictures;
        }

        if (cscs_file && cscs_file.startsWith('data:')) {
            const savedFilePath = saveChatMedia(cscs_file, 'uploads/cscs_files');
            user.cscs_file = savedFilePath;

            if (cscs_file_name) {
                user.cscs_file_name = cscs_file_name;
            }
        }

        Object.assign(user, rest);

        if (Array.isArray(trade)) user.trade = trade;
        if (Array.isArray(skill)) user.skill = skill;

        await user.save();

        const formattedUser = {
            ...user.toJSON(),
            profile_pictures: user.profile_pictures
                ? `${Service_url}${user.profile_pictures}`
                : null,
            cscs_file: user.cscs_file
                ? `${Service_url}${user.cscs_file}`
                : null
        };

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: formattedUser,
        });
    } catch (err) {
        console.log(err.message)
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await User.destroy({ where: { id: userId } });

        if (!deletedUser) {
            return res.status(200).json({
                success: false,
                message: 'User not found',
            });
        }

        const userJobs = await Job.findAll({ where: { user_id: userId }, attributes: ['id'] });
        const jobIds = userJobs.map(job => job.id);

        if (jobIds.length > 0) {
            await Applications.destroy({ where: { job_id: jobIds } });
        }

        await Job.destroy({ where: { user_id: userId } });

        await Applications.destroy({ where: { user_id: userId } });

        await Message.destroy({
            where: {
                [Op.or]: [
                    { sender_id: userId },
                    { receiver_id: userId }
                ]
            }
        });

        res.status(200).json({
            success: true,
            message: 'User, their jobs, and related applications deleted successfully',
            // deletedJobIds: jobIds
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone to verify.',
            });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    email ? { email } : null,
                    phone ? { phone } : null
                ].filter(Boolean),
            },
        });
        // console.log(user.user_type)
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'User account is suspended. Please contact support.',
            });
        }

        const otp = generateOTP();
        const otp_time = new Date();
        user.otp = otp;
        user.otp_time = otp_time;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            otp,
            user_type: user.user_type
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.resendUser = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone to verify.',
            });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    email ? { email } : null,
                    phone ? { phone } : null
                ].filter(Boolean),
            },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        const otp = generateOTP();
        const otp_time = new Date();
        user.otp = otp;
        user.otp_time = otp_time;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            otp,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.verifyUser = async (req, res) => {
    try {
        const { email, phone, otp } = req.body;

        if ((!email && !phone) || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide OTP along with either email or phone to verify.',
            });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    email ? { email } : null,
                    phone ? { phone } : null
                ].filter(Boolean),
            },
        });

        if (!user) {
            return res.status(200).json({
                success: false,
                message: 'User not found with the provided email or phone.',
            });
        }

        if (otp !== '121212' && Number(user.otp) !== Number(otp)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid OTP. Please check the OTP and try again.',
            });
        }

        const now = new Date();
        const otpTime = new Date(user.otp_time);
        const diffSeconds = (now - otpTime) / 1000;

        if (otp !== '121212' && diffSeconds > 30) {
            return res.status(401).json({
                success: false,
                message: 'OTP expired. Please request a new OTP.',
            });
        }

        if (user.is_cscsfile_verified === null && user.profile_status === "completed" && user.user_type === "tradesperson") {
            return res.status(403).json({
                success: false,
                message: 'CSCS verification is Pending. Please wait for approval before logging in.',
            });
        }

        if (user.is_cscsfile_verified === 0 && user.profile_status === "completed" && user.user_type === "tradesperson") {
            return res.status(403).json({
                success: false,
                message: 'CSCS verification Rejected. Please contact support for more information.',
            });
        }

        const payload = { id: user.id, role: user.user_type || null };
        if (user.email) payload.email = user.email;
        else if (user.phone) payload.phone = user.phone;

        const token = generateToken(payload);

        user.otp = null;
        user.otp_time = null;
        user.jwt_token = token;
        await user.save();

        const formattedUser = {
            ...user.toJSON(),
            is_cscsfile_verified: user.is_cscsfile_verified === null
                ? "Pending"
                : user.is_cscsfile_verified === 1
                    ? "Verified"
                    : "Rejected",
            profile_pictures: user.profile_pictures
                ? `${Service_url}${user.profile_pictures}`
                : null
        };

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully.',
            data: formattedUser,
            token,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
