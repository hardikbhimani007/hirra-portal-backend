const express = require('express');
const router = express.Router();
const CategoriesController = require('../Controllers/categories');
const { verifyToken } = require('../utils/JWT_token');

router.post('/Insert', verifyToken, CategoriesController.createCategory);
router.get('/Select', verifyToken, CategoriesController.getCategories);
router.get('/', verifyToken, CategoriesController.getAllCategories);
router.post('/Update', verifyToken, CategoriesController.updateCategory);
router.delete('/Delete/:id', verifyToken, CategoriesController.deleteCategory);

module.exports = router;
