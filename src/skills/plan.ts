import type { CoursePack, Question } from '../domain/types';

// Personalization (architecture §7.3 / plan.next_action): order a member's questions so their
// WEAKEST concepts (lowest BKT mastery) come first. Same Course Pack → a different path per member.
export function orderQuestionsForMember(course: CoursePack, mastery: Record<string, { pL: number }> = {}): Question[] {
  const score = (cid: string) => mastery[cid]?.pL ?? 0; // unseen = 0 → practiced first
  const byConcept = new Map<string, Question[]>();
  for (const q of course.questions) {
    const a = byConcept.get(q.conceptId) || [];
    a.push(q);
    byConcept.set(q.conceptId, a);
  }
  const concepts = [...byConcept.keys()].sort((a, b) => score(a) - score(b));
  const out: Question[] = [];
  for (const c of concepts) {
    out.push(...(byConcept.get(c) || []).slice().sort((x, y) => (x.difficulty || 3) - (y.difficulty || 3)));
  }
  return out;
}

// Adaptive selection (the real personalization): from a shared question pool, pick THIS member's
// next session based on their BKT mastery —
//   • skip concepts they've already mastered (pL ≥ MASTERED)
//   • weakest concepts first
//   • match question difficulty to their pL on that concept (low pL → easier, rising → harder)
//   • SPREAD the session across as many concepts as possible (sparse sampling of the pool)
//   • add seeded randomness so two learners with the same mastery don't get the same questions
// Empty result ⇒ everything mastered ⇒ the quest page shows the "all mastered" screen.
const MASTERED = 0.8; // matches domain/mastery.ts
const SESSION_SIZE = 6;
const JITTER = 0.15;  // randomizes ordering among similarly-weak concepts so sessions diverge
const DIFF_BAND = 2;  // within a concept, pick randomly among questions ≤ this many difficulty levels from target

// Tiny seeded PRNG (string hash → mulberry32). Same seed ⇒ same sequence (so a single attempt is
// stable across reloads); DIFFERENT seeds (other members / later attempts) diverge. No seed ⇒ Math.random.
function makeRng(seed?: string): () => number {
  if (seed == null) return Math.random;
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectQuestionsForMember(
  course: CoursePack,
  mastery: Record<string, { pL: number }> = {},
  seed?: string,
): Question[] {
  const rnd = makeRng(seed);
  const pL = (cid: string) => mastery[cid]?.pL ?? 0;

  const byConcept = new Map<string, Question[]>();
  for (const q of course.questions) {
    const a = byConcept.get(q.conceptId) || [];
    a.push(q);
    byConcept.set(q.conceptId, a);
  }

  // Not-yet-mastered concepts, weakest-first — but with a random jitter so two learners with the
  // SAME mastery (e.g. both brand-new ⇒ every pL=0) don't get the identical ordering. This is the
  // root cause of "5/6 questions are the same across accounts": equal mastery → identical sort.
  const concepts = [...byConcept.keys()]
    .filter((c) => pL(c) < MASTERED)
    .map((c) => ({ c, k: pL(c) + rnd() * JITTER })) // jitter assigned ONCE per concept = a stable sort key
    .sort((a, b) => a.k - b.k)                        // (re-rolling rnd() inside the comparator would be inconsistent)
    .map((x) => x.c);

  // Per concept: take the difficulty-appropriate window (questions within DIFF_BAND levels of target)
  // and SHUFFLE it per seed — so the same concept surfaces different questions across learners/attempts
  // while staying on-level. Falls back to all the concept's questions if the window is too small.
  const queues = concepts.map((c) => {
    const target = Math.min(5, Math.max(1, Math.round(1 + pL(c) * 4))); // pL 0→1 … 0.75→4
    const qs = byConcept.get(c)!;
    let band = qs.filter((x) => Math.abs((x.difficulty || 3) - target) <= DIFF_BAND);
    if (band.length < 2) band = qs.slice();
    return band.map((x) => ({ x, r: rnd() })).sort((a, b) => a.r - b.r).map((o) => o.x);
  });

  // Round-robin one question per concept per pass → spreads the session across MANY concepts
  // (sparse) instead of clustering several from the few weakest ones.
  const out: Question[] = [];
  for (let pass = 0; out.length < SESSION_SIZE; pass++) {
    let added = false;
    for (const q of queues) {
      if (out.length >= SESSION_SIZE) break;
      if (q[pass]) { out.push(q[pass]); added = true; }
    }
    if (!added) break; // every concept's queue exhausted
  }

  // Shuffle each MCQ's options so the correct answer isn't always in the same slot. The generator
  // (LLM) tends to list the correct option FIRST, so unshuffled it reads as a fixed A,A,A… pattern.
  // Seeded per (member-seed, question id) → stable within an attempt, varies across learners/attempts.
  // Grading is by option TEXT (assess.gradeObjective), so reordering never affects correctness.
  return out.map((q) => shuffleOptions(q, seed));
}

function shuffleOptions(q: Question, seed?: string): Question {
  if (q.type !== 'mcq' || !q.options || q.options.length < 2) return q;
  const r = makeRng(`${seed ?? 'opt'}:${q.id}`);
  const options = q.options.map((o) => ({ o, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.o);
  return { ...q, options };
}

// The concept a member most needs to work on — used to personalize nudges.
export function weakestConcept(course: CoursePack, mastery: Record<string, { pL: number }> = {}): string {
  const c = course.concepts.slice().sort((a, b) => (mastery[a.id]?.pL ?? 0) - (mastery[b.id]?.pL ?? 0))[0];
  return c?.name || course.title;
}
