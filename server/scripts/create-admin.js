import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db.js';

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    console.error('Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.');
    process.exitCode = 1;
} else {
    try {
        const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
        await pool.query(
            `INSERT INTO users (id, full_name, email, password_hash, role)
             VALUES (?, ?, ?, ?, 'admin')`,
            [randomUUID(), ADMIN_NAME.trim(), ADMIN_EMAIL.trim().toLowerCase(), passwordHash]
        );
        console.log('Admin account created.');
    } finally {
        await pool.end();
    }
}