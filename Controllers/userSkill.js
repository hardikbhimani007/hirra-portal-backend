const pool = require('../database');

async function callSP(operationType, params = {}) {
    const [rows] = await pool.query(
        `CALL sp_users_skill(?, ?, ?, ?)`,
        [
            operationType,
            params.id ?? null,
            params.user_id ?? null,
            params.skill_name ?? null
        ]
    );
    return rows;
}

exports.createSkill = async (req, res) => {
    try {
        const result = await callSP("INSERT", req.body);
        const data = result[0]?.[0];

        res.status(201).json({
            success: data?.success === 1,
            message: data?.message
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getSkills = async (req, res) => {
    try {
        const result = await callSP("SELECT", { user_id: req.params.id || null });
        const skills = result[0] || [];
        const successRow = result[1]?.[0];

        res.status(200).json({
            success: successRow?.success === 1,
            message: successRow?.success === 1 ? 'Skills fetched successfully' : successRow?.message || 'No skills found',
            data: successRow?.success === 1 ? skills : [],
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateSkill = async (req, res) => {
    try {
        const result = await callSP("UPDATE", req.body);
        const data = result[0]?.[0];

        res.status(200).json({
            success: true,
            message: data?.message,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.deleteSkill = async (req, res) => {
    try {
        const result = await callSP("DELETE", { id: req.params.id });
        const data = result[0]?.[0];

        res.status(200).json({
            success: data?.success === 1,
            message: data?.message,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
