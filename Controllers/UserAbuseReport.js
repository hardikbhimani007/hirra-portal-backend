const UserAbuseReport = require('../models/UserAbuseReport');
const User = require('../models/user');

exports.createUserAbuseReport = async (req, res) => {
  try {
    const { user_id, report_by, report_reason } = req.body;

    const userExists = await User.findByPk(user_id);
    if (!userExists) {
      return res.status(400).json({ success: false, message: 'User does not exist.' });
    }

    const alreadyReported = await UserAbuseReport.findOne({
      where: { user_id, report_by }
    });

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this user.'
      });
    }

    const report = await UserAbuseReport.create({ user_id, report_by, report_reason });

    return res.status(201).json({
      success: true,
      message: 'User abuse report created!',
      data: report
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getUserAbuseReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await UserAbuseReport.findByPk(id);
    if (!report) return res.status(200).json({ success: false, message: 'Report not found' });

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReportsByUserId = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required' });

    const reports = await UserAbuseReport.findAll({ where: { user_id }, order: [['created_at', 'DESC']] });
    return res.json({ success: true, total_count: reports.length, data: reports });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteUserAbuseReport = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await UserAbuseReport.destroy({ where: { id } });
    if (!deleted) return res.status(200).json({ success: false, message: 'Report not found' });

    return res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
