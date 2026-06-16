import { pool } from './client';
import { SCHEMA_SQL } from './schema';

// Create tables (idempotent). Run: npx tsx src/db/migrate.ts
(async () => {
  await pool.query(SCHEMA_SQL);
  const { rows } = await pool.query(
    `select table_name from information_schema.tables where table_schema='public' order by table_name`,
  );
  console.log('✅ schema applied. tables:', rows.map((r) => r.table_name).join(', '));
  await pool.end();
})().catch((e) => {
  console.error('❌ migrate:', e instanceof Error ? e.message : e);
  process.exit(1);
});
