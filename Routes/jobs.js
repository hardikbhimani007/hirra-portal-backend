const express = require('express');
const router = express.Router();
const jobController = require('../Controllers/jobs');
const { verifyToken, checkRole } = require('../utils/JWT_token');

router.post('/insert', verifyToken, checkRole('subcontractor'), jobController.createJob);
router.get('/select/:id', verifyToken, jobController.getJobById);
router.post('/update/:id', verifyToken, jobController.updateJob);
router.delete('/delete/:id', verifyToken, jobController.deleteJob);
router.get('/user', verifyToken, jobController.getJobsByUserId);
router.get('/dashboard', verifyToken, jobController.getDashboardJobs);

module.exports = router;
