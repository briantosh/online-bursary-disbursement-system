import { Router } from 'express';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { courses } from '../../../shared/courses.js';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

const staffSchema = z.object({
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    role: z.enum(['bursary_officer', 'admin'])
});

const registrySchema = z.object({
    admissionNumber: z.string().trim().min(3).max(32),
    fullName: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    course: z.string().trim().min(3).max(160),
    status: z.enum(['enrolled', 'graduated', 'withdrawn']).default('enrolled')
});

adminRouter.post('/students', requireAuth, requireRole('admin'), async (request, response) => {
    const parsed = registrySchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Enter a valid admission number, name, email, course, and status.' });
    }

    const student = parsed.data;
    if (!courses.includes(student.course)) {
        return response.status(400).json({ message: 'Choose a course from the approved course list.' });
    }

    const admissionNumber = student.admissionNumber.toUpperCase();
    const email = student.email.toLowerCase();
    await pool.execute(
        `INSERT INTO student_registry (admission_number, full_name, email, course, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            email = VALUES(email),
            course = VALUES(course),
            status = VALUES(status)`,
        [admissionNumber, student.fullName, email, student.course, student.status]
    );

    response.status(201).json({
        student: { admissionNumber, fullName: student.fullName, email, course: student.course, status: student.status }
    });
});

adminRouter.post('/staff', requireAuth, requireRole('admin'), async (request, response) => {
    const parsed = staffSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Enter a name, valid email, 12-character password, and staff role.' });
    }

    const data = parsed.data;
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });
    const userId = randomUUID();
    try {
        await pool.execute(
            `INSERT INTO users (id, full_name, email, password_hash, role)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, data.fullName, data.email.toLowerCase(), passwordHash, data.role]
        );
        const user = { id: userId, fullName: data.fullName, email: data.email.toLowerCase(), role: data.role, status: 'active' };
        response.status(201).json({ user });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return response.status(409).json({ message: 'An account already exists for this email.' });
        }
        throw error;
    }
});