import { Pool } from 'pg';
import { config } from '../config';

if (!config.DATABASE_URL) console.warn('⚠️  DATABASE_URL not set — DB features will fail.');

// Railway's public proxy needs SSL without cert verification.
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export const q = (text: string, params?: unknown[]) => pool.query(text, params);
