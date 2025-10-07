const JobsSaved = require('../models/jobsSaved');
const userSchema = require('../models/user');
const jobsSchema = require('../models/jobs');
const { Op } = require('sequelize');

exports.saveJob = async (req, res) => {
    try {
        const { user_id, job_id } = req.body;
        if (!user_id || !job_id) {
            return res.status(400).json({ success: false, message: 'user_id and job_id are required' });
        }

        const userExists = await userSchema.findByPk(user_id);
        if (!userExists) {
            return res.status(200).json({ success: false, message: 'User not found' });
        }

        const jobExists = await jobsSchema.findByPk(job_id);
        if (!jobExists) {
            return res.status(200).json({ success: false, message: 'Job not found' });
        }

        const alreadySaved = await JobsSaved.findOne({ where: { user_id, job_id } });

        if (alreadySaved) {
            await alreadySaved.destroy();
            return res.status(200).json({ success: true, message: 'Job unsaved successfully!' });
        } else {
            const savedJob = await JobsSaved.create({ user_id, job_id });
            return res.status(201).json({ success: true, message: 'Job saved successfully!'});
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.getSavedJobsByUser = async (req, res) => {
    try {
        const { user_id, last_id } = req.query;
        if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required' });

        const whereClause = { user_id };
        if (last_id) {
            const lastJobSaved = await JobsSaved.findByPk(last_id);
            if (!lastJobSaved) return res.status(400).json({ success: false, message: 'Invalid last_id' });
            whereClause.created_at = { [Op.lt]: lastJobSaved.created_at };
        }

        const savedJobsRecords = await JobsSaved.findAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: 15
        });

        if (!savedJobsRecords.length) {
            return res.status(200).json({ success: false, message: 'No saved jobs found' });
        }

        const jobIds = savedJobsRecords.map(record => record.job_id);

        const jobs = await jobsSchema.findAll({
            where: { id: { [Op.in]: jobIds } },
            order: [['created_at', 'DESC']]
        });

        return res.json({ success: true, data: jobs });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSavedJob = async (req, res) => {
    try {
        const { user_id, job_id } = req.body;
        if (!user_id || !job_id) {
            return res.status(400).json({ success: false, message: 'user_id and job_id are required' });
        }

        const deleted = await JobsSaved.destroy({
            where: { user_id, job_id }
        });

        if (!deleted) {
            return res.status(200).json({ success: false, message: 'Saved job not found' });
        }

        return res.json({ success: true, message: 'Job Unsaved successfully.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
