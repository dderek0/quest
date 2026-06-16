import { callJSON } from '../llm/client';
import { MODELS } from '../llm/models';
import type { Question } from '../domain/types';

const norm = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// MCQ / exact — no LLM. Accepts the option text or its index.
export function gradeObjective(question: Question, answer: string): { correct: boolean; score: number } {
  const a = norm(answer);
  const key = norm(question.answer);
  let correct = a === key;
  if (!correct && question.options) {
    const idx = Number(answer);
    if (!Number.isNaN(idx) && question.options[idx]) correct = norm(question.options[idx]) === key;
  }
  return { correct, score: correct ? 1 : 0 };
}

// Short-answer — Qwen (thinking off) grades against the rubric, returns a 0..1 score + feedback.
export async function gradeFreetext(
  question: Question,
  answer: string,
  lang = 'vi',
): Promise<{ score: number; correct: boolean; feedback: string }> {
  const sys = `Bạn là giám khảo công bằng. Chấm CÂU TRẢ LỜI tự luận dựa trên RUBRIC và Ý CHÍNH (không bịa).
Trả JSON THUẦN: {"score": <số 0..1>, "feedback": "1 câu góp ý ngắn, khích lệ, bằng tiếng ${lang}"}.`;
  const user = `CÂU HỎI: ${question.stem}
Ý CHÍNH/ĐÁP ÁN: ${question.answer}
RUBRIC: ${question.rubric ?? '(không có)'}

TRẢ LỜI CỦA HỌC VIÊN:
${answer}`;
  try {
    const out = await callJSON<{ score: number; feedback: string }>(
      MODELS.tutor,
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { temperature: 0.1, maxTokens: 400, noThink: true },
    );
    const score = Math.max(0, Math.min(1, Number(out.score) || 0));
    return { score, correct: score >= 0.6, feedback: out.feedback || '' };
  } catch {
    return { score: 0, correct: false, feedback: 'Mình chưa chấm được câu này, bạn thử lại nhé.' };
  }
}
