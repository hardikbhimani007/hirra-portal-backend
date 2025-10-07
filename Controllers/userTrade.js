const pool = require('../database');

async function callSP(operationType, params = {}) {
    const [rows] = await pool.query(
        `CALL sp_users_trade(?, ?, ?, ?)`,
        [
            operationType,
            params.id ?? null,
            params.user_id ?? null,
            params.trade_name ?? null
        ]
    );
    return rows;
}

exports.createTrade = async (req, res) => {
    try {
        const result = await callSP("INSERT", req.body);
        const data = result[0] && result[0][0];

        res.status(201).json({
            success: true,
            message: data.message
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.getTrades = async (req, res) => {
    try {
        const result = await callSP("SELECT", { user_id: req.params.id || null });
        const trades = result[0] || [];
        const successRow = result[1]?.[0];

        res.status(200).json({
            success: successRow?.success === 1,
            message: successRow?.success === 1 ? 'Trades fetched successfully' : successRow?.message || 'No trades found',
            data: successRow?.success === 1 ? trades : [],
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.updateTrade = async (req, res) => {
    try {
        const result = await callSP("UPDATE", req.body);
        const data = result[0] && result[0][0];

        res.status(200).json({
            success: true,
            message: data.message,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

exports.deleteTrade = async (req, res) => {
    try {
        const result = await callSP("DELETE", { id: req.params.id });
        const data = result[0] && result[0][0];

        res.status(200).json({
            success: true,
            message: data.message,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
