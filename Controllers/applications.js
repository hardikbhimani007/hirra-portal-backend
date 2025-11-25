const Application = require('../models/applications');
const User = require('../models/user');
const Job = require('../models/jobs');
const JobAbuseReport = require('../models/jobAbuseReports');
const { timeSince } = require('../utils/common');
const { Op } = require('sequelize');

Job.belongsTo(User, { foreignKey: 'user_id', as: 'Poster' });
Application.belongsTo(User, { foreignKey: 'user_id' });
Application.belongsTo(Job, { foreignKey: 'job_id' });

const Service_url = process.env.SERVICE_URL || '';

exports.createApplication = async (req, res) => {
    try {
        const { user_id, job_id } = req.body;

        const userExists = await User.findByPk(user_id);
        if (!userExists) return res.status(400).json({
            success: false, message: `User does not exist. Please provide a valid user_id.`
        });

        const jobExists = await Job.findByPk(job_id);
        if (!jobExists) return res.status(400).json({
            success: false, message: `Job does not exist. Please provide a valid job_id.`
        });

        if (jobExists.user_id === user_id) {
            return res.status(400).json({
                success: false,
                message: `You cannot apply to your own job.`
            });
        }

        const alreadyApplied = await Application.findOne({ where: { user_id, job_id } });
        if (alreadyApplied) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this job. Duplicate applications are not allowed.'
            });
        }

        const data = {
            ...req.body,
            application_status: 'Sent'
        };

        const app = await Application.create(data);
        return res.status(201).json({
            success: true,
            message: `Your application for the job has been submitted successfully!`,
            data: app
        });
    } catch (err) {
        // console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Application ID is required' });

        const app = await Application.findByPk(id);
        if (!app) return res.status(200).json({ success: false, message: 'Application not found' });

        const user = await User.findByPk(app.user_id, {
            attributes: ['user_type', 'name']
        });

        const job = await Job.findByPk(app.job_id, {
            attributes: [
                'user_id', 'title', 'description', 'location',
                'lat', 'long', 'hourly_rate', 'is_green_project',
                'start_date', 'duration', 'skills'
            ]
        });

        return res.json({
            success: true,
            data: {
                id: app.id,
                job_id: app.job_id,
                application_status: app.application_status,
                since_applied: timeSince(app.created_at),
                created_at: app.created_at,
                updated_at: app.updated_at,
                ...user?.toJSON(),
                ...job?.toJSON()
            }
        });
    } catch (err) {
        // console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getApplicationsByUserId = async (req, res) => {
    try {
        const { user_id, page = 1, status, search } = req.query;
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const currentPage = parseInt(page, 10) || 1;
        const limit = 6;
        const offset = (currentPage - 1) * limit;

        let filteredWhereClause = { user_id };
        if (status) filteredWhereClause.application_status = status.toLowerCase();
        if (search && search.trim() !== "") {
            filteredWhereClause[Op.or] = [
                { '$Job.title$': { [Op.like]: `%${search}%` } },
                { '$Job.skills$': { [Op.like]: `%${search}%` } },
                { '$User.name$': { [Op.like]: `%${search}%` } }
            ];
        }

        const totalApplications = await Application.count({
            where: { user_id }
        });

        const totalFilteredApplications = await Application.count({
            where: filteredWhereClause,
            include: [
                { model: Job, attributes: [] },
                { model: User, attributes: [] }
            ]
        });

        const apps = await Application.findAll({
            where: filteredWhereClause,
            include: [
                {
                    model: Job,
                    where: { status: true },
                    attributes: [
                        'id', 'user_id', 'title', 'description', 'location',
                        'lat', 'long', 'hourly_rate', 'is_green_project',
                        'start_date', 'duration', 'skills', 'company_email', 'company_phone'
                    ],
                    include: [
                        {
                            model: User,
                            as: 'Poster',
                            attributes: ['id', 'name']
                        }
                    ]
                },
                {
                    model: User,
                    attributes: ['user_type', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        if (!apps.length) {
            return res.status(200).json({ success: false, message: 'No applications found', data: [] });
        }

        const applicationsWithDetails = await Promise.all(
            apps.map(async (app) => {
                const abuseReportsRaw = await JobAbuseReport.findAll({ where: { job_id: app.job_id } });
                const userReport = abuseReportsRaw.find(r => r.report_by == user_id);

                const abuseReports = await Promise.all(
                    abuseReportsRaw.map(async (report) => {
                        const reporter = await User.findByPk(report.report_by, {
                            attributes: ['name', 'profile_pictures']
                        });

                        return {
                            ...report.toJSON(),
                            reporter_name: reporter ? reporter.name : null,
                            reporter_profile_picture: reporter ? Service_url + reporter.profile_pictures : null,
                            reported_since: timeSince(report.created_at),
                        };
                    })
                );

                return {
                    id: app.id,
                    job_id: app.job_id,
                    application_status: app.application_status,
                    since_applied: timeSince(app.created_at),
                    created_at: app.created_at,
                    updated_at: app.updated_at,
                    applicant_user_id: app.user_id,
                    applicant_name: app.User?.name,
                    ...app.Job?.toJSON(),
                    job_poster_name: app.Job?.Poster?.name,
                    job_abuse_count: abuseReports.length,
                    abuse_reports: abuseReports,
                    abuse_report: {
                        reported: !!userReport,
                        report_reason: userReport ? userReport.report_reason : null,
                        reported_since: userReport ? timeSince(userReport.created_at) : null
                    }
                };
            })
        );

        const [viewedCount, shortlistedCount] = await Promise.all([
            Application.count({ where: { user_id, application_status: 'viewed' } }),
            Application.count({ where: { user_id, application_status: 'shortlisted' } })
        ]);

        return res.json({
            success: true,
            total_applications: totalApplications,
            viewed_count: viewedCount,
            shortlisted_count: shortlistedCount,
            current_page: currentPage,
            per_page: limit,
            total_pages: Math.ceil(totalFilteredApplications / limit),
            data: applicationsWithDetails,
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getApplications = async (req, res) => {
    try {
        const { user_id, job_id, last_id, status, search } = req.query;

        if (!user_id && !job_id) {
            return res.status(400).json({ success: false, message: 'user_id or job_id is required' });
        }

        const limit = 14;
        const whereClause = {};

        if (user_id) whereClause.user_id = user_id;
        if (job_id) whereClause.job_id = job_id;
        if (status) whereClause.application_status = status.toLowerCase();

        let noLimit = false;

        if (last_id && last_id !== "all") {
            const lastApp = await Application.findByPk(last_id);
            if (!lastApp) return res.status(400).json({ success: false, message: 'Invalid last_id' });
            whereClause.created_at = { [Op.lt]: lastApp.created_at };
        }

        if (search || last_id === "all") {
            noLimit = true;
        }

        const apps = await Application.findAll({
            where: whereClause,
            order: [['id', 'DESC']],
            ...(noLimit ? {} : { limit })
        });

        if (!apps.length) {
            return res.status(200).json({ success: false, message: 'No applications found', data: [] });
        }

        const userIds = [...new Set(apps.map(a => a.user_id))];
        const users = await User.findAll({
            where: { id: userIds },
            attributes: ['id', 'user_type', 'name', "profile_pictures", "description", "availability", "radius"]
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u.toJSON()]));

        const jobIds = [...new Set(apps.map(a => a.job_id))];
        const jobs = await Job.findAll({
            where: { id: jobIds },
            attributes: [
                'id', 'user_id', 'title', 'location',
                'lat', 'long', 'hourly_rate', 'is_green_project', 'company_email', 'company_phone',
                'start_date', 'duration', 'skills'
            ]
        });
        const jobMap = Object.fromEntries(jobs.map(j => [j.id, j.toJSON()]));

        let applicationsWithDetails = apps.map(app => {
            const user = userMap[app.user_id] || {};
            const job = jobMap[app.job_id] || {};
            const profile_pictures = Service_url + user.profile_pictures;
            return {
                application_id: app.id,
                job_id: app.job_id,
                userId: user.id,
                application_status: app.application_status,
                profile_picture: profile_pictures,
                description: user.description,
                since_applied: timeSince(app.created_at),
                created_at: app.created_at,
                updated_at: app.updated_at,
                ...user,
                ...job
            };
        });

        if (search) {
            const searchLower = search.toLowerCase();
            applicationsWithDetails = applicationsWithDetails.filter(app => {
                const name = app.name || "";
                const availability = app.availability || "";
                const skills = Array.isArray(app.skills) ? app.skills : JSON.parse(app.skills || '[]');

                const nameMatch = name.toLowerCase().includes(searchLower);
                const availabilityMatch = availability.toLowerCase().includes(searchLower);
                const skillsMatch = skills.some(skill => skill.toLowerCase().includes(searchLower));

                return nameMatch || availabilityMatch || skillsMatch;
            });
        }

        return res.json({
            success: true,
            data: applicationsWithDetails
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getApplicationsExcludingUserId = async (req, res) => {
    try {
        const { user_id, last_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required' });

        const limit = 15;
        const whereClause = { user_id: { [Op.ne]: user_id } };

        if (last_id) {
            const lastApp = await Application.findByPk(last_id);
            if (!lastApp) return res.status(400).json({ success: false, message: 'Invalid last_id' });
            whereClause.created_at = { [Op.lt]: lastApp.created_at };
        }

        const apps = await Application.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit
        });

        if (!apps.length) return res.status(200).json({ success: false, message: 'No applications found' });

        const applicationsWithDetails = await Promise.all(apps.map(async app => {
            const user = await User.findByPk(app.user_id, {
                attributes: ['user_type', 'name']
            });

            const job = await Job.findByPk(app.job_id, {
                attributes: [
                    'user_id', 'title', 'description', 'location',
                    'lat', 'long', 'hourly_rate', 'is_green_project', 'company_email', 'company_phone',
                    'start_date', 'duration', 'skills'
                ]
            });

            return {
                id: app.id,
                job_id: app.job_id,
                application_status: app.application_status,
                since_applied: timeSince(app.created_at),
                created_at: app.created_at,
                updated_at: app.updated_at,
                ...user?.toJSON(),
                ...job?.toJSON()
            };
        }));

        return res.json({ success: true, data: applicationsWithDetails });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateApplication = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Application ID is required' });

        const [updated] = await Application.update(req.body, { where: { id } });
        if (!updated) return res.status(200).json({ success: false, message: 'Application not found' });

        const app = await Application.findByPk(id);
        return res.json({ success: true, data: app });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteApplication = async (req, res) => {
    try {
        const { user_id, job_id } = req.body;
        if (!user_id || !job_id) {
            return res.status(400).json({ success: false, message: 'user_id and job_id are required' });
        }

        const deleted = await Application.destroy({ where: { user_id, job_id } });

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        return res.json({ success: true, message: 'Application deleted successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

