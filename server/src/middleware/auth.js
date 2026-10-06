import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';

export async function requireAuth(request, response, next) {
    const authorization = request.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return response.status(401).json({ message: 'Sign in to continue.' });
    }

    let claims;
    try {
        claims = jwt.verify(token, config.jwtSecret, {
            issuer: 'bursary-auth-api',
            audience: 'bursary-react-client'
        });
    } catch {
        return response.status(401).json({ message: 'Your session is invalid or has expired.' });
    }

    const [users] = await pool.execute(
        `SELECT id, full_name, email, role, status, admission_number, course, year_of_study
         FROM users WHERE id = ?`,
        [claims.sub]
    );

    if (!users.length || users[0].status !== 'active') {
        return response.status(401).json({ message: 'This account is not active.' });
    }

    request.user = users[0];
    next();
}

export function requireRole(...roles) {
    return (request, response, next) => {
        if (!roles.includes(request.user?.role)) {
            return response.status(403).json({ message: 'You do not have permission to do that.' });
        }
        next();
    };
}