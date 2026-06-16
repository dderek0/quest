import { getClass } from '../db/store';
import { signLink } from '../domain/links';
import { config } from '../config';
import { pool } from '../db/client';

// Print a Coach's Board link for a class. Usage: npx tsx src/scripts/demo-board.ts <classId>
(async () => {
  const classId = process.argv[2];
  if (!classId) throw new Error('usage: demo-board.ts <classId>');
  const cls = await getClass(classId);
  if (!cls) throw new Error('class not found: ' + classId);
  const token = signLink({ m: 'coach', c: classId });
  console.log(`class: ${cls.name}`);
  console.log('TOKEN=' + token);
  console.log('BOARD URL:\n' + `${config.BASE_URL}/board/${token}`);
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
