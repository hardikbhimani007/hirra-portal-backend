const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const COMPANY_NAME = process.env.COMPANY_NAME;

function generateToken(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Payload must be an object');
    }
    const finalPayload = {
        ...payload,
        company: COMPANY_NAME
    };
    return jwt.sign(finalPayload, JWT_SECRET);
}

function verifyTokenSync(token) {
    return jwt.verify(token, JWT_SECRET);
}

function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided..' });
        }

        const decoded = verifyTokenSync(token);

        const COMPANY_NAME = process.env.COMPANY_NAME;
        if (!decoded.company || decoded.company !== COMPANY_NAME) {
            return res.status(403).json({
                success: false,
                message: 'Invalid company in token!',
            });
        }

        req.user = decoded;
        next();
    } catch (err) {
        console.log(err)
        return res.status(401).json({ success: false, message: 'Authentication failed! Please provide a valid token.' });
    }
}

function checkRole(requiredRole) {
    return (req, res, next) => {
        const userRole = req.user.role;
        if (!userRole || userRole !== requiredRole) {
            return res.status(403).json({
                success: false,
                message: `Access denied! Only ${requiredRole}s can perform this action.`,
            });
        }
        next();
    };
}

module.exports = { generateToken, verifyToken, verifyTokenSync, checkRole };
