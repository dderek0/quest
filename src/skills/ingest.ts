import { callJSON } from '../llm/client';
import { MODELS } from '../llm/models';
import { newId } from '../domain/id';
import type { Concept, Question, CoursePack } from '../domain/types';

// docs → Course Pack. The pipeline (architecture.md §7.1):
//   extractConcepts (Qwen) → planCurriculum (MiniMax) → generateQuestions (Qwen)
// Grounded: every concept/question must come from the source — no invention.

// 1) Pull the concept graph + a course title/summary from the raw material.
export async function extractConcepts(
  text: string,
  language = 'vi',
  instructions = '',
): Promise<{ title: string; summary: string; concepts: Concept[] }> {
  const sys = `Bạn là chuyên gia thiết kế chương trình học. Từ TÀI LIỆU NGUỒN, trích ra các khái niệm cốt lõi người học cần nắm.
CHỈ bám sát tài liệu, KHÔNG bịa thêm. Trả về JSON THUẦN:
{
  "title": "tiêu đề ngắn cho khoá học",
  "summary": "1-2 câu tóm tắt",
  "concepts": [
    {"id":"c1","name":"...","summary":"1-2 câu bám tài liệu","keyFacts":["..."],"prereqs":[],"difficulty":1,"bloom":"understand","citations":["trích đoạn nguồn"]}
  ]
}
Quy tắc: id dạng c1,c2,...; difficulty 1 (dễ) → 5 (khó); prereqs là danh sách id học trước. Ngôn ngữ đầu ra: ${language}.${instructions ? `\nYÊU CẦU THÊM TỪ GIÁO VIÊN (ưu tiên cao): ${instructions}` : ''}`;
  return callJSON<{ title: string; summary: string; concepts: Concept[] }>(
    MODELS.tutor,
    [
      { role: 'system', content: sys },
      { role: 'user', content: text.slice(0, 24000) },
    ],
    { temperature: 0.2, maxTokens: 2500, noThink: true },
  );
}

// 2) De-dup, sequence (respect prereqs), re-rate difficulty. Falls back gracefully
//    to the extracted order if the reasoner model isn't available.
export async function planCurriculum(concepts: Concept[], language = 'vi'): Promise<Concept[]> {
  try {
    const sys = `Bạn là kiến trúc sư chương trình học. Cho danh sách khái niệm nháp: gộp trùng lặp, sắp thứ tự hợp lý (tôn trọng prereqs, dễ→khó), gán lại difficulty 1-5. Giữ nguyên id khi có thể. Trả JSON THUẦN {"concepts":[...]}. Ngôn ngữ: ${language}.`;
    const out = await callJSON<{ concepts: Concept[] }>(
      MODELS.reasoner,
      [
        { role: 'system', content: sys },
        { role: 'user', content: JSON.stringify({ concepts }) },
      ],
      { temperature: 0.2, maxTokens: 4000 },
    );
    return out.concepts?.length ? out.concepts : concepts;
  } catch (e) {
    console.warn('• planCurriculum skipped (reasoner unavailable):', e instanceof Error ? e.message : e);
    return concepts;
  }
}

// 3) Per concept: grounded MCQ + short-answer items.
export async function generateQuestions(
  concept: Concept,
  source: string,
  language = 'vi',
  n = 3,
  instructions = '',
): Promise<Question[]> {
  const sys = `Soạn ${n} câu hỏi kiểm tra cho MỘT khái niệm, CHỈ dựa trên TÀI LIỆU NGUỒN (không bịa). Trộn trắc nghiệm (mcq) và tự luận ngắn (short).
- mcq: 4 lựa chọn, 1 đúng + 3 nhiễu hợp lý; "answer" = nội dung lựa chọn đúng.
- short: kèm "rubric" chấm điểm.
Mỗi câu có "explanation" 1 câu, "difficulty" 1-5. Trả JSON THUẦN:
{"questions":[{"type":"mcq","stem":"...","options":["..."],"answer":"...","explanation":"...","difficulty":2}]}
Ngôn ngữ: ${language}.${instructions ? `\nYÊU CẦU THÊM TỪ GIÁO VIÊN (ưu tiên cao, áp dụng cho mọi câu): ${instructions}` : ''}`;
  const user = `KHÁI NIỆM: ${concept.name}
TÓM TẮT: ${concept.summary}
DỮ KIỆN: ${(concept.keyFacts || []).join(' | ')}

TÀI LIỆU NGUỒN:
${source.slice(0, 12000)}`;
  const out = await callJSON<{ questions: Question[] }>(
    MODELS.tutor,
    [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    { temperature: 0.3, maxTokens: 1800, noThink: true },
  );
  return (out.questions || []).map((q, i) => ({ ...q, id: `${concept.id}-q${i + 1}`, conceptId: concept.id }));
}

// Orchestrate: text → CoursePack. Questions generated per-concept in parallel.
export async function buildCoursePack(
  text: string,
  opts: { title?: string; language?: string; perConcept?: number; instructions?: string } = {},
): Promise<CoursePack> {
  const language = opts.language || 'vi';
  const instructions = opts.instructions || '';
  const { title, summary, concepts: draft } = await extractConcepts(text, language, instructions);
  const concepts = await planCurriculum(draft, language);
  const perConcept = opts.perConcept ?? 3;
  const groups = await Promise.all(concepts.map((c) => generateQuestions(c, text, language, perConcept, instructions)));
  return {
    id: newId('cp'),
    title: opts.title || title,
    summary,
    language,
    concepts,
    questions: groups.flat(),
    sourceChars: text.length,
  };
}
