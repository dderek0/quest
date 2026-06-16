import { config } from '../config';
import { Client } from 'pg';

// Probe the DB connection; figure out which SSL setting Railway's proxy wants.
async function attempt(label: string, ssl: false | { rejectUnauthorized: boolean }) {
  const c = new Client({ connectionString: config.DATABASE_URL, ssl });
  try {
    await c.connect();
    const r = await c.query('select version()');
    console.log(`✅ ${label}: ${r.rows[0].version.slice(0, 70)}`);
    return true;
  } catch (e) {
    console.log(`✗ ${label}: ${e instanceof Error ? e.message : e}`);
    return false;
  } finally {
    await c.end().catch(() => {});
  }
}

(async () => {
  if (!config.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  console.log('url:', config.DATABASE_URL.replace(/:[^:@/]+@/, ':***@'));
  if (await attempt('ssl (no-verify)', { rejectUnauthorized: false })) return;
  await attempt('no ssl', false);
})();
