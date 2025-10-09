const express = require('express');
const router = express.Router();
const AdminController = require('../Controllers/admin');
const { verifyToken } = require('../utils/JWT_token');
const { truncateMessages } = require('../Controllers/messageController');

router.get('/jobs', verifyToken, AdminController.getJobs);
router.get('/tradespersons', verifyToken, AdminController.getTradesperson);
router.get('/subcontractors', verifyToken, AdminController.getSubcontractors);
router.delete('/delete', truncateMessages);

module.exports = router;
