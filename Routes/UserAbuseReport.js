const express = require('express');
const router = express.Router();
const UserAbuseReportController = require('../controllers/UserAbuseReport');
const { verifyToken } = require('../utils/JWT_token');

router.post('/insert', verifyToken, UserAbuseReportController.createUserAbuseReport);
router.get('/select/:id', verifyToken, UserAbuseReportController.getUserAbuseReportById);
router.post('/Select', verifyToken, UserAbuseReportController.getReportsByUserId);
router.delete('/delete/:id', verifyToken, UserAbuseReportController.deleteUserAbuseReport);

module.exports = router;
