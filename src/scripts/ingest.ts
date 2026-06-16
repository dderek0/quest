import fs from 'fs';
import { buildCoursePack } from '../skills/ingest';

// Demo the magic moment: a doc → a Course Pack.
// Usage: npx tsx src/scripts/ingest.ts [path-to-doc]   (defaults to a sample AI policy)
const SAMPLE = `CHÍNH SÁCH SỬ DỤNG AI (tóm tắt nội bộ)
1. Chỉ được đưa vào mô hình AI dữ liệu đã ẩn danh. Không gồm họ tên, số điện thoại, email, hay lịch sử thanh toán của người chơi.
2. Không dán dữ liệu sản xuất (production) hoặc dữ liệu khách hàng thật vào các công cụ AI công cộng.
3. Khi dùng AI để tạo nội dung marketing, phải có người kiểm duyệt trước khi đăng.
4. Mọi tài khoản AI nội bộ phải bật xác thực 2 lớp (2FA).
5. Báo cáo ngay cho đội bảo mật nếu nghi ngờ rò rỉ dữ liệu qua công cụ AI.`;

const file = process.argv[2];
const text = file ? fs.readFileSync(file, 'utf8') : SAMPLE;

(async () => {
  console.error(`Ingesting ${file ? file : 'sample AI policy'} (${text.length} chars)…`);
  console.time('ingest');
  const cp = await buildCoursePack(text);
  console.timeEnd('ingest');
  console.log(JSON.stringify(cp, null, 2));
  console.error(`\n→ "${cp.title}" · ${cp.concepts.length} concepts · ${cp.questions.length} questions`);
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
