import { buildCoursePack } from '../skills/ingest';
import { createClass, saveCoursePack, upsertMember, getCoursePack } from '../db/store';
import { pool } from '../db/client';
import { newId } from '../domain/id';
import { signLink } from '../domain/links';
import { config } from '../config';

// Seed a member + mint a quest link to test the learning loop.
// Usage: npx tsx src/scripts/demo-quest.ts [existingCourseId]   (builds fresh if omitted)
const SAMPLE = `CHÍNH SÁCH SỬ DỤNG AI (tóm tắt nội bộ)
1. Chỉ được đưa vào mô hình AI dữ liệu đã ẩn danh. Không gồm họ tên, số điện thoại, email, hay lịch sử thanh toán của người chơi.
2. Không dán dữ liệu sản xuất (production) hoặc dữ liệu khách hàng thật vào các công cụ AI công cộng.
3. Khi dùng AI để tạo nội dung marketing, phải có người kiểm duyệt trước khi đăng.
4. Mọi tài khoản AI nội bộ phải bật xác thực 2 lớp (2FA).
5. Báo cáo ngay cho đội bảo mật nếu nghi ngờ rò rỉ dữ liệu qua công cụ AI.`;

(async () => {
  let courseId = process.argv[2];
  let classId: string;
  if (courseId) {
    const r = await pool.query('select class_id from course_packs where id=$1', [courseId]);
    if (!r.rows[0]) throw new Error('CoursePack not found: ' + courseId);
    classId = r.rows[0].class_id || newId('class');
  } else {
    console.log('Building a fresh Course Pack…');
    const cp = await buildCoursePack(SAMPLE);
    classId = newId('class');
    await createClass({ id: classId, name: cp.title, courseId: cp.id, visibility: 'private', inviteCode: newId('join'), linkCode: newId('coach') });
    await saveCoursePack(cp, classId);
    courseId = cp.id;
    console.log('  built', cp.id, '·', cp.questions.length, 'questions');
  }
  const memberId = newId('mem');
  await upsertMember({ id: memberId, classId, chatId: 'demo-user', name: 'An', role: 'community manager', status: 'active', engagement: { xp: 0, level: 1, streak: 3 } });
  const token = signLink({ m: memberId, c: courseId });
  console.log(`\n✅ member ${memberId} · course ${courseId}`);
  console.log('QUEST URL:\n' + `${config.BASE_URL}/q/${token}`);
  const course = await getCoursePack(courseId);
  const q1 = course?.questions[0];
  if (q1) console.log('\nTOKEN=' + token + '\nQ1_ID=' + q1.id + '\nQ1_TYPE=' + q1.type + '\nQ1_ANSWER=' + q1.answer);
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
