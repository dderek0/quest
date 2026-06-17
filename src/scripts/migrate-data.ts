import { Pool } from 'pg';
import { SCHEMA_SQL } from '../db/schema';

// One-shot data migration: copy every row from the OLD Postgres to a NEW one (e.g. Railway → GreenNode vDB).
// Uses only `pg` (no pg_dump/psql needed). Idempotent: re-runnable (ON CONFLICT DO NOTHING).
//
//   OLD_DATABASE_URL=postgresql://… \
//   NEW_DATABASE_URL=postgresql://… \
//   npx tsx src/scripts/migrate-data.ts
//
// OLD_DATABASE_URL defaults to the app's current DATABASE_URL if unset.

const OLD = process.env.OLD_DATABASE_URL || process.env.DATABASE_URL;
const NEW = process.env.NEW_DATABASE_URL;
if (!OLD) throw new Error('Set OLD_DATABASE_URL (or DATABASE_URL) to the source DB.');
if (!NEW) throw new Error('Set NEW_DATABASE_URL to the destination DB.');

// Railway needs SSL; GreenNode vDB rejects it. Per-side toggle (env: OLD_DB_SSL / NEW_DB_SSL = on|off).
const sslOpt = (v: string | undefined, dflt: boolean) =>
  (v === 'off' || v === 'false' ? false : v === 'on' || v === 'true' ? { rejectUnauthorized: false } : dflt ? { rejectUnauthorized: false } : false);
const oldPool = new Pool({ connectionString: OLD, ssl: sslOpt(process.env.OLD_DB_SSL, true), max: 4 });
const newPool = new Pool({ connectionString: NEW, ssl: sslOpt(process.env.NEW_DB_SSL, false), max: 4 });

// FK-safe-ish order (no hard FKs, but keep parents first for sanity).
const TABLES = ['classes', 'coaches', 'materials', 'course_packs', 'members', 'quest_runs', 'events'];
const CHUNK = 200;

async function columnsOf(table: string): Promise<{ name: string; jsonb: boolean }[]> {
  const { rows } = await oldPool.query(
    `select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name=$1 order by ordinal_position`,
    [table],
  );
  return rows.map((r) => ({ name: r.column_name, jsonb: r.data_type === 'jsonb' }));
}

async function copyTable(table: string): Promise<{ src: number; dst: number }> {
  const cols = await columnsOf(table);
  if (!cols.length) {
    console.log(`· ${table}: no such column metadata, skipping`);
    return { src: 0, dst: 0 };
  }
  const names = cols.map((c) => c.name);
  const { rows } = await oldPool.query(`select ${names.map((n) => `"${n}"`).join(',')} from ${table}`);
  const src = rows.length;
  if (!src) { console.log(`· ${table}: 0 rows`); return { src: 0, dst: 0 }; }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = batch.map((row) => {
      const ph = cols.map((c) => {
        // jsonb columns: stringify the JS value so Postgres parses it as JSON (a raw JS array
        // would otherwise be sent as a Postgres array literal and fail the jsonb cast).
        const v = c.jsonb && row[c.name] != null ? JSON.stringify(row[c.name]) : row[c.name];
        params.push(v);
        return `$${params.length}`;
      });
      return `(${ph.join(',')})`;
    });
    await newPool.query(
      `insert into ${table} (${names.map((n) => `"${n}"`).join(',')}) values ${tuples.join(',')} on conflict do nothing`,
      params,
    );
  }
  const dst = Number((await newPool.query(`select count(*)::int n from ${table}`)).rows[0].n);
  console.log(`· ${table}: ${src} → ${dst}`);
  return { src, dst };
}

(async () => {
  console.log('Applying schema to NEW db…');
  await newPool.query(SCHEMA_SQL);

  console.log('Copying tables (OLD → NEW)…');
  const totals = { src: 0, dst: 0 };
  for (const t of TABLES) {
    const r = await copyTable(t);
    totals.src += r.src;
  }

  // events.id is bigserial — realign its sequence past the copied max so new inserts don't collide.
  await newPool.query(
    `select setval(pg_get_serial_sequence('events','id'), greatest((select coalesce(max(id),0) from events),1))`,
  );

  console.log('\nVerify row counts on NEW:');
  for (const t of TABLES) {
    const n = (await newPool.query(`select count(*)::int n from ${t}`)).rows[0].n;
    totals.dst += Number(n);
    console.log(`  ${t.padEnd(12)} ${n}`);
  }
  console.log(`\nDone. Copied source rows: ${totals.src}; destination total: ${totals.dst}.`);
  await oldPool.end();
  await newPool.end();
})().catch((e) => {
  console.error('❌ migration failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
