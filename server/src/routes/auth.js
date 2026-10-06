import { Router } from 'express';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { courses } from '../../../shared/courses.js';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
    role: z.enum(['student', 'bursary_officer', 'admin'])
});

const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    admissionNumber: z.string().trim().min(3).max(32),
    course: z.string().trim().min(3).max(160),
    yearOfStudy: z.enum(['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgraduate'])
});

const publicUser = user => ({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    admissionNumber: user.admission_number,
    course: user.course,
    yearOfStudy: user.year_of_study
});

function issueAccessToken(user) {
    return jwt.sign({ role: user.role }, config.jwtSecret, {
        subject: user.id,
        issuer: 'bursary-auth-api',
        audience: 'bursary-react-client',
        expiresIn: '15m'
    });
}

authRouter.post('/login', async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Enter a valid email, password, and account type.' });
    }

    const email = parsed.data.email.toLowerCase();
    const rows = await pool.execute(
        `SELECT id, full_name, email, password_hash, role, status,
                admission_number, course, year_of_study
         FROM users WHERE email = ? AND role = ?`,
        [email, parsed.data.role]
    );
    const [users] = rows;
    const user = users[0];
    const passwordMatches = user
        ? await argon2.verify(user.password_hash, parsed.data.password).catch(() => false)
        : false;

    if (!user || !passwordMatches) {
        return response.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (user.status !== 'active') {
        return response.status(403).json({ message: 'This account is not active. Contact the bursary office.' });
    }

    response.json({ accessToken: issueAccessToken(user), tokenType: 'Bearer', expiresIn: 900, user: publicUser(user) });
});

authRouter.post('/register', async (request, response) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Check your details and choose a course from the list.' });
    }

    const data = parsed.data;
    const normalizedEmail = data.email.toLowerCase();
    const normalizedAdmission = data.admissionNumber.toUpperCase();
    if (!courses.includes(data.course)) {
        return response.status(400).json({ message: 'Choose a course from the approved course list.' });
    }

    const [registry] = await pool.execute(
        `SELECT admission_number, full_name, email, course
         FROM student_registry
         WHERE admission_number = ? AND email = ? AND status = 'enrolled'`,
        [normalizedAdmission, normalizedEmail]
    );
    const registeredStudent = registry[0];
    if (!registeredStudent
        || registeredStudent.full_name.trim().toLowerCase() !== data.fullName.toLowerCase()
        || registeredStudent.course !== data.course) {
        return response.status(403).json({ message: 'We could not verify your details against the enrolled-student register. Contact student records for help.' });
    }

    try {
        const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
        const userId = randomUUID();
        await pool.execute(
            `INSERT INTO users (id, full_name, email, password_hash, role, admission_number, course, year_of_study)
             VALUES (?, ?, ?, ?, 'student', ?, ?, ?)`,
            [userId, registeredStudent.full_name, normalizedEmail, passwordHash, registeredStudent.admission_number,
                registeredStudent.course, data.yearOfStudy]
        );
        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, admission_number, course, year_of_study
             FROM users WHERE id = ?`,
            [userId]
        );
        const user = users[0];
        response.status(201).json({ accessToken: issueAccessToken(user), tokenType: 'Bearer', expiresIn: 900, user: publicUser(user) });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return response.status(409).json({ message: 'An account already exists for this email or admission number.' });
        }
        throw error;
    }
});

authRouter.get('/me', requireAuth, (request, response) => {
    response.json({ user: publicUser(request.user) });
});