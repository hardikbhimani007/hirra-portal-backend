const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin');
const { verifyToken } = require('../utils/JWT_token');

router.get('/jobs', verifyToken, AdminController.getJobs);
router.get('/tradespersons', verifyToken, AdminController.getTradesperson);
router.get('/subcontractors', verifyToken, AdminController.getSubcontractors);

module.exports = router;
