import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

try {
    const migrationsDirectory = new URL('../migrations/', import.meta.url);
    const migrationFiles = (await readdir(fileURLToPath(migrationsDirectory)))
        .filter(filename => /^\d.*\.sql$/.test(filename))
        .sort();
    for (const filename of migrationFiles) {
        const migrationPath = new URL(filename, migrationsDirectory);
        const sql = await readFile(fileURLToPath(migrationPath), 'utf8');
        const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
        for (const statement of statements) {
            await pool.query(statement);
        }
        console.log(`Applied ${filename}.`);
    }
} finally {
    await pool.end();
}