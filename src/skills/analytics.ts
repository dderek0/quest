import { listMembers, eventStatsByMember } from '../db/store';
import { call } from '../llm/client';
import { MODELS } from '../llm/models';
import type { CoursePack } from '../domain/types';

export type MemberAgg = {
  id: string; name: string; role?: string;
  answered: number; correct: number; correctRate: number;
  avgMastery: number; mastered: number;
  streak: number; optedIn: boolean; // optedIn = name visible to peers on the leaderboard
  status: 'not_started' | 'behind' | 'on_track';
};
export type ClassAgg = {
  members: MemberAgg[];
  concepts: { id: string; name: string; avgMastery: number; learners: number }[];
  total: { members: number; onTrack: number; behind: number; notStarted: number };
};

// Pure code — aggregate per-member progress + per-concept confusion. No LLM.
export async function aggregateClass(classId: string, course: CoursePack | null): Promise<ClassAgg> {
  const all = await listMembers(classId);
  const members = all.filter((m) => (m.status ?? 'active') === 'active'); // waitlisted excluded from stats
  const stats = await eventStatsByMember(classId);
  const conceptIds = (course?.concepts || []).map((c) => c.id);

  const memberAggs: MemberAgg[] = members.map((m) => {
    const st = stats[m.id] || { answered: 0, correct: 0 };
    const mastery = m.mastery || {};
    const eng = m.engagement || {};
    const pLs = conceptIds.map((cid) => mastery[cid]?.pL ?? 0);
    const avg = pLs.length ? pLs.reduce((a, b) => a + b, 0) / pLs.length : 0;
    const mastered = pLs.filter((p) => p >= 0.8).length;
    let status: MemberAgg['status'] = 'on_track';
    if (st.answered === 0) status = 'not_started';
    else if (avg < 0.35) status = 'behind';
    return {
      id: m.id, name: m.name || m.id, role: m.role,
      answered: st.answered, correct: st.correct,
      correctRate: st.answered ? st.correct / st.answered : 0,
      avgMastery: avg, mastered,
      streak: eng.streak || 0, optedIn: !!eng.lb,
      status,
    };
  });

  const concepts = (course?.concepts || []).map((c) => {
    const vals = members
      .map((m) => (m.mastery || {})[c.id]?.pL)
      .filter((v): v is number => typeof v === 'number');
    return { id: c.id, name: c.name, avgMastery: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, learners: vals.length };
  });

  return {
    members: memberAggs,
    concepts,
    total: {
      members: members.length,
      onTrack: memberAggs.filter((m) => m.status === 'on_track').length,
      behind: memberAggs.filter((m) => m.status === 'behind').length,
      notStarted: memberAggs.filter((m) => m.status === 'not_started').length,
    },
  };
}

function fallbackInsight(agg: ClassAgg): string {
  const ns = agg.members.filter((m) => m.status === 'not_started').map((m) => m.name);
  const behind = agg.members.filter((m) => m.status === 'behind').map((m) => m.name);
  const weak = [...agg.concepts].filter((c) => c.learners > 0).sort((a, b) => a.avgMastery - b.avgMastery)[0];
  const parts: string[] = [];
  if (ns.length) parts.push(`${ns.length} chưa bắt đầu (${ns.join(', ')})`);
  if (behind.length) parts.push(`${behind.length} đang tụt lại (${behind.join(', ')})`);
  if (weak) parts.push(`khái niệm yếu nhất: "${weak.name}"`);
  return parts.length ? '📊 ' + parts.join(' · ') + '.' : '📊 Lớp đang tiến triển tốt.';
}

// NL summary of who's at risk + what's confusing + a recommended action (Qwen, thinking off).
export async function cohortInsights(agg: ClassAgg, courseTitle: string): Promise<string> {
  try {
    const sys = `Bạn là trợ lý cho coach/giáo viên. Dựa CHỈ trên DỮ LIỆU lớp, viết 2-3 câu NGẮN tiếng Việt: ai cần chú ý, khái niệm nào cả lớp đang yếu, kèm 1 đề xuất hành động. Không bịa số liệu.`;
    const out = await call(
      MODELS.tutor,
      [{ role: 'system', content: sys }, { role: 'user', content: `Khoá "${courseTitle}". Dữ liệu: ${JSON.stringify(agg)}` }],
      { temperature: 0.3, maxTokens: 400, noThink: true },
    );
    return out.trim() || fallbackInsight(agg);
  } catch {
    return fallbackInsight(agg);
  }
}

// ask-your-class: answer the coach's NL question over the aggregated data (grounded).
export async function askClass(question: string, agg: ClassAgg, courseTitle: string): Promise<string> {
  try {
    const sys = `Bạn trả lời câu hỏi của coach về lớp học, CHỈ dựa trên DỮ LIỆU JSON cung cấp (không bịa). Trả lời ngắn gọn, tiếng Việt, nêu tên học viên cụ thể khi phù hợp.`;
    const out = await call(
      MODELS.tutor,
      [{ role: 'system', content: sys }, { role: 'user', content: `Khoá "${courseTitle}". Câu hỏi: ${question}\n\nDỮ LIỆU LỚP (JSON): ${JSON.stringify(agg)}` }],
      { temperature: 0.2, maxTokens: 400, noThink: true },
    );
    return out.trim() || 'Mình chưa trả lời được, bạn thử hỏi cách khác nhé.';
  } catch {
    return 'Mình chưa truy vấn được dữ liệu lúc này.';
  }
}
