import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool(config.databaseUrl);

pool.on('error', error => {
    console.error('Unexpected MySQL pool error:', error);
});