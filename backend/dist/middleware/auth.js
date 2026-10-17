import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'apex-bank-secure-secret-key-2024';
export function generateToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Authentication token required' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Forbidden: Invalid or expired authentication token' });
    }
}
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: User not authenticated' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: `Forbidden: Access restricted. Required role(s): ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
            });
            return;
        }
        next();
    };
}
