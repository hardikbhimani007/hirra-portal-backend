const express = require('express');
const router = express.Router();
const userSkillController = require('../Controllers/userSkill');
const { verifyToken } = require('../utils/JWT_token');

router.post('/Insert', verifyToken, userSkillController.createSkill);
router.get('/Select/:id', verifyToken, userSkillController.getSkills); 
router.post('/Update', verifyToken, userSkillController.updateSkill);
router.delete('/Delete/:id', verifyToken, userSkillController.deleteSkill);

module.exports = router;
