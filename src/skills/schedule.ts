import { call } from '../llm/client';
import { MODELS } from '../llm/models';

// Compose a short, warm "game noti" for Zalo (Gemma — fast, direct). Text only;
// the caller appends the quest link. (architecture.md §7.3)
export async function composeNudge(opts: {
  name?: string;
  courseTitle: string;
  kind?: 'new' | 'streak' | 'remind';
  streak?: number;
}): Promise<string> {
  const kind = opts.kind || 'new';
  const sys = `Bạn viết MỘT thông báo NGẮN (tối đa 2 dòng) kiểu thông báo game cho app học tập, tiếng Việt, thân thiện, có emoji.
Có thể nhấn mạnh bằng shortcode: {big}...{/big} cho tiêu đề, {orange}...{/orange} cho từ khoá quan trọng.
KHÔNG kèm đường link (hệ thống tự thêm sau). Chỉ trả về đúng nội dung tin nhắn, không giải thích.`;
  const user = `Học viên: ${opts.name || 'bạn'}. Khoá học: "${opts.courseTitle}". Chuỗi ngày: ${opts.streak ?? 0}.
Loại: ${kind} (new = nhiệm vụ mới, streak = giữ chuỗi, remind = nhắc đã bỏ lỡ). Viết lời mời học hôm nay.`;
  try {
    const t = await call(
      MODELS.gate,
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { temperature: 0.7, maxTokens: 120 },
    );
    return t.trim() || '{big}📣 Nhiệm vụ hôm nay{/big}\nĐã sẵn sàng cho bạn! ⚔️';
  } catch {
    return '{big}📣 Nhiệm vụ hôm nay{/big}\nĐã sẵn sàng cho bạn! ⚔️';
  }
}

// Personalized re-engagement agent: reads ONE member's profile and picks the most RELEVANT,
// honest motivation (streak · about-to-level-up · weak-concept · comeback · new content),
// then writes a personalized reminder inviting them back to learn — no manipulation. (re-engagement loop)
export type MemberProfile = {
  name?: string; role?: string;
  level?: number; streak?: number; xpToNext?: number;
  weakestConcept?: string; mastered?: number; total?: number; daysSinceActive?: number;
};

export async function growthHook(p: MemberProfile, courseTitle: string): Promise<string> {
  const sys = `Bạn viết lời nhắc học tập NGẮN, cá nhân hoá và chân thành cho một app học trên Zalo.
Viết MỘT tin nhắn (1–2 dòng) mời học viên quay lại học, dựa trên động lực PHÙ HỢP NHẤT với hồ sơ: giữ chuỗi ngày, sắp lên cấp, một điểm yếu cụ thể cần ôn, lâu chưa học, hay có nội dung mới.
Giọng tích cực, tôn trọng — KHÔNG thao túng, KHÔNG tạo áp lực giả. Tiếng Việt, thân thiện, cá nhân hoá theo tên & điểm yếu, có emoji. Có thể dùng {orange}…{/orange} hoặc {big}…{/big}.
KHÔNG kèm đường link (hệ thống tự thêm). Chỉ trả về đúng nội dung tin nhắn.`;
  const user = `Hồ sơ:
- Tên: ${p.name || 'bạn'}${p.role ? ` (vai trò: ${p.role})` : ''}
- Khoá: "${courseTitle}"
- Cấp ${p.level ?? 1}, chuỗi ${p.streak ?? 0} ngày${p.xpToNext != null ? `, còn ${p.xpToNext} XP là lên cấp` : ''}
- Thành thạo ${p.mastered ?? 0}/${p.total ?? 0} khái niệm
- Điểm yếu hiện tại: ${p.weakestConcept || '(chưa rõ)'}
- Số ngày chưa học: ${p.daysSinceActive ?? 0}`;
  try {
    const t = await call(MODELS.gate, [{ role: 'system', content: sys }, { role: 'user', content: user }], { temperature: 0.85, maxTokens: 150 });
    return t.trim() || growthFallback(p);
  } catch {
    return growthFallback(p);
  }
}

function growthFallback(p: MemberProfile): string {
  if ((p.streak || 0) >= 2) return `{big}🔥 Giữ chuỗi ${p.streak} ngày!{/big}\n${p.name || 'Bạn'} ơi, làm nhanh 1 nhiệm vụ để không mất chuỗi nhé 💪`;
  if (p.xpToNext != null && p.xpToNext <= 20) return `{big}⭐ Sắp lên cấp ${(p.level ?? 1) + 1}!{/big}\nChỉ còn ${p.xpToNext} XP nữa thôi ${p.name || ''} 🚀`;
  if (p.weakestConcept) return `{big}📣 ${p.name || 'Bạn'} ơi!{/big}\nÔn nhanh “{orange}${p.weakestConcept}{/orange}” — 5 phút thôi ⚔️`;
  return '{big}📣 Nhiệm vụ hôm nay đã sẵn sàng!{/big} ⚔️';
}

// Completion congrats: a short, HONEST celebration sent when a learner FINISHES a quest (Gemma — fast).
// On a REDO it celebrates the real improvement vs last time (mastery delta); never invents progress.
// Text only; the caller appends a deterministic stats line. Code fallback below.
export async function congratsLine(p: {
  name?: string; courseTitle: string; level?: number; streak?: number;
  redo?: boolean; masteryNow?: number; masteryDelta?: number;
}): Promise<string> {
  const sys = `Bạn viết MỘT lời chúc mừng NGẮN (1–2 dòng) khi học viên vừa HOÀN THÀNH một nhiệm vụ học tập, cho app trên Zalo.
Giọng vui, chân thành, khích lệ — KHÔNG phóng đại, KHÔNG tạo áp lực. Tiếng Việt, có emoji. Có thể dùng {big}…{/big} và {orange}…{/orange}.
Nếu là LÀM LẠI: tập trung khen sự TIẾN BỘ so với lần trước khi độ thành thạo tăng; nếu CHƯA tăng thì động viên luyện tập tiếp một cách trung thực — KHÔNG bịa ra tiến bộ.
Có thể nhắc tên & chuỗi ngày nếu hợp lý. KHÔNG kèm link, KHÔNG liệt kê số liệu (hệ thống tự thêm). Chỉ trả về đúng nội dung tin nhắn.`;
  const ctx = p.redo
    ? `Đây là lần LÀM LẠI. Độ thành thạo hiện tại ${p.masteryNow ?? 0}%${typeof p.masteryDelta === 'number' ? `, thay đổi ${p.masteryDelta >= 0 ? '+' : ''}${p.masteryDelta}% so với lần trước` : ''}.`
    : 'Đây là lần hoàn thành đầu tiên.';
  const user = `Học viên: ${p.name || 'bạn'}. Khoá: "${p.courseTitle}". Cấp ${p.level ?? 1}, chuỗi ${p.streak ?? 0} ngày. ${ctx} Viết lời chúc mừng phù hợp.`;
  try {
    const t = await call(MODELS.gate, [{ role: 'system', content: sys }, { role: 'user', content: user }], { temperature: 0.8, maxTokens: 130 });
    return t.trim() || congratsFallback(p);
  } catch {
    return congratsFallback(p);
  }
}

function congratsFallback(p: { name?: string; streak?: number; redo?: boolean; masteryDelta?: number }): string {
  const who = p.name || 'Bạn';
  if (p.redo && (p.masteryDelta ?? 0) > 0) return `{big}📈 Tiến bộ rồi!{/big}\n${who} làm lại tốt hơn lần trước — {orange}+${p.masteryDelta}%{/orange} thành thạo! 💪`;
  if (p.redo) return `{big}🔁 Làm lại xong!{/big}\nÔn thêm là nhớ lâu hơn, ${who} ơi — cứ giữ nhịp nhé! ⚔️`;
  if ((p.streak || 0) >= 2) return `{big}🎉 Hoàn thành rồi!{/big}\n${who} giữ chuỗi {orange}${p.streak} ngày{/orange} luôn — quá đỉnh! 💪`;
  return `{big}🎉 Hoàn thành nhiệm vụ!{/big}\nGiỏi lắm ${who} ơi, tiếp tục phát huy nhé! ⚔️`;
}
