import { createClass, saveCoursePack, upsertMember, recordEvent, addMaterial, setActiveQuest } from '../db/store';
import { buildCoursePack } from '../skills/ingest';
import { newId } from '../domain/id';
import { signLink } from '../domain/links';
import { config } from '../config';
import { pool } from '../db/client';

// A clean demo Class: 1 Material → 1 active Quest, with An (on-track) · Minh (behind) · Lan (not started).
// Usage: npx tsx src/scripts/seed-demo.ts
const SAMPLE = `CHÍNH SÁCH SỬ DỤNG AI (tóm tắt nội bộ)
1. Chỉ được đưa vào mô hình AI dữ liệu đã ẩn danh. Không gồm họ tên, số điện thoại, email, hay lịch sử thanh toán của người chơi.
2. Không dán dữ liệu sản xuất (production) hoặc dữ liệu khách hàng thật vào các công cụ AI công cộng.
3. Khi dùng AI để tạo nội dung marketing, phải có người kiểm duyệt trước khi đăng.
4. Mọi tài khoản AI nội bộ phải bật xác thực 2 lớp (2FA).
5. Báo cáo ngay cho đội bảo mật nếu nghi ngờ rò rỉ dữ liệu qua công cụ AI.`;
const bkt = (pL: number) => ({ pL, pT: 0.15, pS: 0.1, pG: 0.2 });

(async () => {
  const classId = newId('class');
  const invite = newId('join');
  const link = newId('coach');
  await createClass({ id: classId, name: 'Chính sách AI tuần này', visibility: 'private', inviteCode: invite, linkCode: link });

  const matId = newId('mat');
  await addMaterial({ id: matId, classId, title: 'Chính sách sử dụng AI', content: SAMPLE });

  console.log('Building Quest from material…');
  const cp = await buildCoursePack(SAMPLE);
  await saveCoursePack(cp, classId, [matId]);
  await setActiveQuest(classId, cp.id);
  const courseId = cp.id;
  const cids = cp.concepts.map((c) => c.id);

  const mk = async (name: string, role: string, mastery: Record<string, unknown>, eng: object) => {
    const id = newId('mem');
    await upsertMember({ id, classId, name, role, status: 'active', mastery, engagement: eng });
    return id;
  };

  const anM: Record<string, unknown> = {};
  cids.forEach((c, i) => { anM[c] = bkt([0.92, 0.86, 0.8, 0.72, 0.66, 0.6][i] ?? 0.7); });
  const an = await mk('An', 'community manager', anM, { xp: 200, level: 3, streak: 6 });

  const minhM: Record<string, unknown> = {};
  if (cids[0]) minhM[cids[0]] = bkt(0.3);
  if (cids[1]) minhM[cids[1]] = bkt(0.18);
  const minh = await mk('Minh', 'UA marketer', minhM, { xp: 40, level: 1, streak: 1 });

  await mk('Lan', 'producer', {}, { xp: 0, level: 1, streak: 0 });

  for (let i = 0; i < 8; i++) await recordEvent({ memberId: an, classId, conceptId: cids[i % cids.length], questionId: 'seed', score: i < 7 ? 1 : 0, skill: 'assess.grade_objective', model: 'code' });
  for (let i = 0; i < 4; i++) await recordEvent({ memberId: minh, classId, conceptId: cids[i % 2] ?? cids[0], questionId: 'seed', score: i < 2 ? 1 : 0, skill: 'assess.grade_objective', model: 'code' });

  const coachToken = signLink({ m: 'coach', c: classId });
  console.log(`\n✅ class ${classId} · quest ${courseId}`);
  console.log(`invite=${invite}  link=${link}`);
  console.log('MANAGE_URL=' + `${config.BASE_URL}/manage/${coachToken}`);
  console.log('BOARD_URL=' + `${config.BASE_URL}/board/${coachToken}`);
  console.log('AN_TOKEN=' + signLink({ m: an, c: courseId }));
  console.log('MINH_TOKEN=' + signLink({ m: minh, c: courseId }));
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
