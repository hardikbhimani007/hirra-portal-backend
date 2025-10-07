const express = require('express');
const router = express.Router();
const jobsSavedController = require('../Controllers/jobsSaved');
const { verifyToken } = require('../utils/JWT_token');

router.post('/', verifyToken, jobsSavedController.saveJob);
router.get('/Select', verifyToken, jobsSavedController.getSavedJobsByUser); 
router.post('/Delete', verifyToken, jobsSavedController.deleteSavedJob);

module.exports = router;
