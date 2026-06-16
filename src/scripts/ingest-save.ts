import fs from 'fs';
import { buildCoursePack } from '../skills/ingest';
import { createClass, saveCoursePack, getCoursePack } from '../db/store';
import { newId } from '../domain/id';
import { pool } from '../db/client';

// doc → CoursePack → persist → read back. Proves the LLM pipeline + DB storage end-to-end.
// Usage: npx tsx src/scripts/ingest-save.ts [path-to-doc]
const SAMPLE = `CHÍNH SÁCH SỬ DỤNG AI (tóm tắt nội bộ)
1. Chỉ được đưa vào mô hình AI dữ liệu đã ẩn danh. Không gồm họ tên, số điện thoại, email, hay lịch sử thanh toán của người chơi.
2. Không dán dữ liệu sản xuất (production) hoặc dữ liệu khách hàng thật vào các công cụ AI công cộng.
3. Khi dùng AI để tạo nội dung marketing, phải có người kiểm duyệt trước khi đăng.
4. Mọi tài khoản AI nội bộ phải bật xác thực 2 lớp (2FA).
5. Báo cáo ngay cho đội bảo mật nếu nghi ngờ rò rỉ dữ liệu qua công cụ AI.`;

const file = process.argv[2];
const text = file ? fs.readFileSync(file, 'utf8') : SAMPLE;

(async () => {
  console.log('Building Course Pack…');
  const cp = await buildCoursePack(text);
  const classId = newId('class');
  await createClass({
    id: classId,
    name: cp.title,
    courseId: cp.id,
    visibility: 'private',
    linkCode: newId('coach'),
    inviteCode: newId('join'),
  });
  await saveCoursePack(cp, classId);

  const back = await getCoursePack(cp.id);
  console.log(`✅ saved CoursePack ${cp.id} → class ${classId}`);
  console.log(`   read back: "${back?.title}" · ${back?.concepts.length} concepts · ${back?.questions.length} questions`);
  console.log(`   sample Q: ${back?.questions[0]?.stem}`);
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
