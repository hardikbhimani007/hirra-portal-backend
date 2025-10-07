const express = require('express');
const router = express.Router();
const appController = require('../controllers/applications');
const { verifyToken } = require('../utils/JWT_token');

router.post('/insert', verifyToken, appController.createApplication);
router.get('/select/:id', verifyToken, appController.getApplicationById);
router.post('/update/:id', verifyToken, appController.updateApplication);
router.delete('/delete/:id', verifyToken, appController.deleteApplication);
router.get('/myApplications', verifyToken, appController.getApplicationsByUserId);
router.get('/', verifyToken, appController.getApplications);
router.get('/Dashboard', verifyToken, appController.getApplicationsExcludingUserId);

module.exports = router;
