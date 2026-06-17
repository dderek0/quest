import { Pool } from 'pg';
import { config } from '../config';

if (!config.DATABASE_URL) console.warn('⚠️  DATABASE_URL not set — DB features will fail.');

// SSL is provider-dependent: GreenNode vDB rejects SSL (DB_SSL=off, the default); Railway's public
// proxy required it (DB_SSL=require). Pool size is DB_POOL_MAX (20 by default for public testing).
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
  max: config.DB_POOL_MAX,
});

export const q = (text: string, params?: unknown[]) => pool.query(text, params);
