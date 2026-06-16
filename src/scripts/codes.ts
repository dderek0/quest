import { pool } from '../db/client';

// Print a class's invite/link codes (for testing the join + coach flows).
// Usage: npx tsx src/scripts/codes.ts [courseId]
(async () => {
  const courseId = process.argv[2];
  const sql = courseId
    ? `select id,name,invite_code,link_code,course_id from classes where course_id=$1 order by created_at desc limit 1`
    : `select id,name,invite_code,link_code,course_id from classes order by created_at desc limit 5`;
  const { rows } = await pool.query(sql, courseId ? [courseId] : []);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
