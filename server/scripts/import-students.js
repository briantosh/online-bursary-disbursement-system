import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { pool } from '../src/db.js';

const filename = process.argv[2];
if (!filename) {
    console.error('Usage: npm run registry:import -- path/to/students.csv');
    process.exitCode = 1;
} else {
    const records = parse(await readFile(filename), {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    const requiredColumns = ['admission_number', 'full_name', 'email', 'course'];
    if (!records.length || requiredColumns.some(column => !(column in records[0]))) {
        throw new Error(`CSV must include these columns: ${requiredColumns.join(', ')}`);
    }

    const client = await pool.getConnection();
    try {
        await client.beginTransaction();
        for (const record of records) {
            const status = String(record.status || 'enrolled').toLowerCase();
            if (!['enrolled', 'graduated', 'withdrawn'].includes(status)) {
                throw new Error(`Invalid registry status for admission number ${record.admission_number}.`);
            }
            await client.execute(
                `INSERT INTO student_registry (admission_number, full_name, email, course, status)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    email = VALUES(email),
                    course = VALUES(course),
                    status = VALUES(status)`,
                [record.admission_number.toUpperCase(), record.full_name, record.email.toLowerCase(),
                    record.course, status]
            );
        }
        await client.commit();
        console.log(`Imported ${records.length} student records.`);
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}