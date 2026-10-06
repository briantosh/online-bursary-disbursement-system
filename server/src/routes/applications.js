import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import { bursaries } from '../../../shared/bursaries.js';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const applicationsRouter = Router();

const uploadTranscript = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_request, file, callback) => {
        if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
            const error = new Error('Upload your academic transcript as a PDF file.');
            error.code = 'INVALID_TRANSCRIPT';
            callback(error);
            return;
        }
        callback(null, true);
    }
});

const applicationSchema = z.object({
    bursaryType: z.string().refine(value => bursaries.includes(value)),
    requestedAmount: z.coerce.number().int().min(100).max(5000),
    statement: z.string().trim().min(30).max(5000)
});

const reviewSchema = z.object({
    status: z.enum(['under_review', 'needs_information', 'approved', 'rejected']),
    reviewNote: z.string().trim().max(2000).optional().default('')
});

const applicationSelect = `
    SELECT a.id, a.reference, a.student_id, a.bursary_type, a.requested_amount,
           a.statement, a.status, a.review_note, a.created_at,
           u.full_name AS student_name, u.email AS student_email,
           u.admission_number, u.course, d.original_filename AS transcript_name
    FROM bursary_applications a
    JOIN users u ON u.id = a.student_id
    LEFT JOIN application_documents d ON d.application_id = a.id`;

applicationsRouter.get('/mine', requireAuth, requireRole('student'), async (request, response) => {
    const [applications] = await pool.execute(
        `${applicationSelect} WHERE a.student_id = ? ORDER BY a.created_at DESC`,
        [request.user.id]
    );
    response.json({ applications });
});

applicationsRouter.post('/', requireAuth, requireRole('student'), uploadTranscript.single('transcript'), async (request, response) => {
    const parsed = applicationSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Check the bursary, amount, and statement fields.' });
    }
    if (!request.file) {
        return response.status(400).json({ message: 'Attach your academic transcript as a PDF file.' });
    }
    if (request.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return response.status(400).json({ message: 'The uploaded file is not a valid PDF document.' });
    }

    const applicationId = randomUUID();
    const reference = `BUR-${new Date().getFullYear()}-${applicationId.slice(0, 8).toUpperCase()}`;
    const documentId = randomUUID();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(
            `INSERT INTO bursary_applications
                (id, reference, student_id, bursary_type, requested_amount, statement)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [applicationId, reference, request.user.id, parsed.data.bursaryType,
                parsed.data.requestedAmount, parsed.data.statement]
        );
        await connection.execute(
            `INSERT INTO application_documents
                (id, application_id, original_filename, mime_type, file_size, document_data)
             VALUES (?, ?, ?, 'application/pdf', ?, ?)`,
            [documentId, applicationId, request.file.originalname.slice(0, 255),
                request.file.size, request.file.buffer]
        );
        await connection.commit();
        response.status(201).json({
            application: {
                id: applicationId,
                reference,
                bursaryType: parsed.data.bursaryType,
                requestedAmount: parsed.data.requestedAmount,
                status: 'submitted',
                transcriptName: request.file.originalname,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
});

applicationsRouter.get('/', requireAuth, requireRole('bursary_officer', 'admin'), async (_request, response) => {
    const [applications] = await pool.execute(`${applicationSelect} ORDER BY a.created_at DESC`);
    response.json({ applications });
});

applicationsRouter.patch('/:id/status', requireAuth, requireRole('bursary_officer', 'admin'), async (request, response) => {
    const parsed = reviewSchema.safeParse(request.body);
    if (!parsed.success) {
        return response.status(400).json({ message: 'Choose a valid application status.' });
    }

    const [result] = await pool.execute(
        `UPDATE bursary_applications SET status = ?, review_note = ? WHERE id = ?`,
        [parsed.data.status, parsed.data.reviewNote || null, request.params.id]
    );
    if (!result.affectedRows) {
        return response.status(404).json({ message: 'Application not found.' });
    }
    response.json({ message: 'Application review updated.' });
});

applicationsRouter.get('/:id/transcript', requireAuth, async (request, response) => {
    const [documents] = await pool.execute(
        `SELECT d.original_filename, d.document_data, a.student_id
         FROM application_documents d
         JOIN bursary_applications a ON a.id = d.application_id
         WHERE a.id = ?`,
        [request.params.id]
    );
    const document = documents[0];
    if (!document) {
        return response.status(404).json({ message: 'Transcript not found.' });
    }
    if (request.user.role === 'student' && request.user.id !== document.student_id) {
        return response.status(403).json({ message: 'You cannot access another student’s transcript.' });
    }
    if (!['student', 'bursary_officer', 'admin'].includes(request.user.role)) {
        return response.status(403).json({ message: 'You do not have permission to download transcripts.' });
    }

    const filename = document.original_filename.replace(/["\r\n]/g, '_');
    response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store'
    });
    response.send(document.document_data);
});