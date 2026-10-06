import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { applicationsRouter } from './routes/applications.js';
import { config } from './config.js';
import { pool } from './db.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));
app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

app.get('/api/v1/health', async (_request, response) => {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/applications', applicationsRouter);

app.use((error, _request, response, _next) => {
    const databaseErrorCodes = new Set([
        'ECONNREFUSED',
        'ER_ACCESS_DENIED_ERROR',
        'ER_BAD_DB_ERROR',
        'ER_NO_SUCH_TABLE',
        'PROTOCOL_CONNECTION_LOST'
    ]);

    if (error.code === 'INVALID_TRANSCRIPT') {
        return response.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return response.status(413).json({ message: 'Transcript files must be 10 MB or smaller.' });
    }

    if (databaseErrorCodes.has(error.code)) {
        console.error(`MySQL request failed: ${error.code}`);
        return response.status(503).json({
            message: 'The bursary database is unavailable. Check the MySQL settings in .env and run npm run db:migrate.'
        });
    }

    console.error(error);
    response.status(500).json({ message: 'An unexpected server error occurred.' });
});