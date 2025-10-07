const JobAbuseReport = require('../models/jobAbuseReports');
const Job = require('../models/jobs');

exports.createJobAbuseReport = async (req, res) => {
  try {
    const { job_id, report_by, report_reason } = req.body;

    const jobExists = await Job.findByPk(job_id);
    if (!jobExists) {
      return res.status(400).json({ success: false, message: 'Job does not exist.' });
    }

    const alreadyReported = await JobAbuseReport.findOne({
      where: { job_id, report_by }
    });

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this job.'
      });
    }

    const report = await JobAbuseReport.create({ job_id, report_by, report_reason });

    return res.status(201).json({
      success: true,
      message: 'Job abuse report created!',
      data: report
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getJobAbuseReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await JobAbuseReport.findByPk(id);
    if (!report) return res.status(200).json({ success: false, message: 'Report not found' });

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReportsByJobId = async (req, res) => {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ success: false, message: 'Job ID is required' });

    const reports = await JobAbuseReport.findAll({ where: { job_id }, order: [['created_at', 'DESC']] });
    return res.json({ success: true, total_count: reports.length, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteJobAbuseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await JobAbuseReport.destroy({ where: { id } });
    if (!deleted) return res.status(200).json({ success: false, message: 'Report not found' });

    return res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
