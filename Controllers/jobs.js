const Job = require('../models/jobs');
const User = require('../models/user');
const Applications = require('../models/applications');
const JobAbuseReport = require('../models/jobAbuseReports');
const { Op } = require('sequelize');
const { isJobSavedByUser, timeSince } = require('../utils/common');

exports.createJob = async (req, res) => {
  try {
    const userExists = await User.findByPk(req.body.user_id);
    if (!userExists) return res.status(400).json({
      success: false, message: `User does not exist. Please provide a valid user_id.`
    });

    const job = await Job.create(req.body);
    return res.status(201).json({ success: true, message: `Job created successfully!`, data: job });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(200).json({ success: false, message: 'Job not found' });
    }

    const jobUser = await User.findByPk(job.user_id, {
      attributes: ['user_type', 'name'],
    });

    const { saved } = await isJobSavedByUser(job.user_id, job.id);

    const jobData = {
      ...job.toJSON(),
      saved,
      since_posted: timeSince(job.created_at),
      user_type: jobUser ? jobUser.user_type : null,
      name: jobUser ? jobUser.name : null,
    };

    return res.json({ success: true, data: jobData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getJobsByUserId = async (req, res) => {
  try {
    const { user_id, page = 1, search } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const currentPage = parseInt(page, 10) || 1;
    const limit = 6;
    const offset = (currentPage - 1) * limit;

    let whereClause = { user_id };

    if (search && search.trim() !== "") {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        // { description: { [Op.like]: `%${search}%` } },
        // { location: { [Op.like]: `%${search}%` } },
        { skills: { [Op.like]: `%${search}%` } },
      ];
    }

    const totalCount = await Job.count({ where: whereClause });

    const jobs = await Job.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    if (!jobs.length) {
      return res.status(200).json({ success: false, message: "No jobs found for this user", data: [] });
    }

    const jobsWithExtras = await Promise.all(
      jobs.map(async (job) => {
        const { saved } = await isJobSavedByUser(user_id, job.id);

        const applicationsCount = await Applications.count({
          where: { job_id: job.id },
        });

        const jobUser = await User.findByPk(job.user_id, {
          attributes: ["user_type", "name"],
        });

        return {
          ...job.toJSON(),
          saved,
          since_posted: timeSince(job.created_at),
          applications_count: applicationsCount,
          user_type: jobUser ? jobUser.user_type : null,
          name: jobUser ? jobUser.name : null,
        };
      })
    );

    return res.json({
      success: true,
      total_count: totalCount,
      current_page: currentPage,
      per_page: limit,
      total_pages: Math.ceil(totalCount / limit),
      data: jobsWithExtras,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDashboardJobs = async (req, res) => {
  try {
    const { user_id, page = 1, saved, search } = req.query;
    if (!user_id)
      return res.status(400).json({ success: false, message: 'User ID is required' });

    const limit = 8;
    const currentPage = parseInt(page, 10) || 1;
    const offset = (currentPage - 1) * limit;

    let whereClause = { user_id: { [Op.ne]: user_id } };

    if (search && search.trim() !== "") {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { skills: { [Op.like]: `%${search}%` } },
      ];
    }

    const allJobs = await Job.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
    });

    const jobsWithExtras = await Promise.all(
      allJobs.map(async (job) => {
        const { saved: isSaved } = await isJobSavedByUser(user_id, job.id);

        if (saved === 'true' && !isSaved) return null;

        const jobUser = await User.findByPk(job.user_id, { attributes: ['user_type', 'name'] });
        const application = await Applications.findOne({ where: { user_id, job_id: job.id } });
        const report = await JobAbuseReport.findOne({
          where: {
            job_id: job.id,
            report_by: user_id
          }
        });
        const reportInfo = {
          reported: !!report,
          report_reason: report ? report.report_reason : null
        };

        return {
          ...job.toJSON(),
          saved: isSaved,
          since_posted: timeSince(job.created_at),
          user_type: jobUser ? jobUser.user_type : null,
          name: jobUser ? jobUser.name : null,
          is_applied: !!application,
          abuse_report: reportInfo
        };
      })
    );

    const filteredJobs = jobsWithExtras.filter(Boolean);

    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    return res.json({
      success: true,
      total_count: filteredJobs.length,
      current_page: currentPage,
      per_page: limit,
      total_pages: Math.ceil(filteredJobs.length / limit),
      data: paginatedJobs,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Job ID is required' });

    const [updated] = await Job.update(req.body, { where: { id } });
    if (!updated) return res.status(200).json({ success: false, message: 'Job not found' });

    const job = await Job.findByPk(id);
    return res.json({ success: true, message: `Job created successfully!`, data: job });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Job ID is required' });
    }

    const job = await Job.findByPk(id);
    if (!job) {
      return res.status(200).json({ success: false, message: 'Job not found' });
    }

    await Applications.destroy({ where: { job_id: id } });

    await Job.destroy({ where: { id } });

    return res.json({ success: true, message: 'Job and related applications deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
