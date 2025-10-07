const express = require('express');
const router = express.Router();
const jobAbuseReportsController = require('../controllers/jobAbuseReports');
const { verifyToken } = require('../utils/JWT_token');

router.post('/insert', verifyToken, jobAbuseReportsController.createJobAbuseReport);
router.get('/select/:id', verifyToken, jobAbuseReportsController.getJobAbuseReportById);
router.post('/Select', verifyToken, jobAbuseReportsController.getReportsByJobId);
router.delete('/delete/:id', verifyToken, jobAbuseReportsController.deleteJobAbuseReport);

module.exports = router;
