const express = require('express');
const router = express.Router();
const usersController = require('../Controllers/user');
const { verifyToken } = require('../utils/JWT_token');
const { handleBase64Upload } = require('../utils/multerConfig');

router.post('/Insert', usersController.insertUser);
router.get('/Select/:id', verifyToken, usersController.getUserById);
router.post('/Create', verifyToken, handleBase64Upload(), usersController.createUser);
router.post('/Update', verifyToken, handleBase64Upload(), usersController.updateUser);
router.post('/Resend', usersController.resendUser);
router.post('/login', usersController.loginUser);
router.post('/VerifyOTP', usersController.verifyUser);
router.delete('/Delete/:id', verifyToken, usersController.deleteUser);

module.exports = router;
