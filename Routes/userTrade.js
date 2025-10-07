const express = require('express');
const router = express.Router();
const userTradeController = require('../Controllers/userTrade');
const { verifyToken } = require('../utils/JWT_token');

router.post('/Insert', verifyToken, userTradeController.createTrade);
router.get('/Select/:id', verifyToken, userTradeController.getTrades);
router.post('/Update', verifyToken, userTradeController.updateTrade);
router.delete('/Delete/:id', verifyToken, userTradeController.deleteTrade);

module.exports = router;
