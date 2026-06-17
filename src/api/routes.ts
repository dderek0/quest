import type { Request, Response } from 'express';
import { config } from '../config';
import { verifyLink, signLink, signQuestLink } from '../domain/links';
import { chunkQuestMessages } from '../domain/notify';
import { newId } from '../domain/id';
import {
  getCoursePack, getMember, upsertMember, recordEvent, getClass,
  approveMember, listWaitlist, setVisibility, createClass, saveCoursePack,
  addMaterial, listMaterials, getMaterialsByIds, listQuests, setActiveQuest,
  adminOverview, deleteClassCascade, listMembers,
  getQuestRow, activeOpenQuests, setQuestActive, setQuestConfig,
  mostRecentActiveQuest, mostRecentQuest, getQuestAttempts, questRunStats, recordQuestCompletion, ensureQuestCompleted, hasAnsweredQuest, hasCorrectAnswer,
  completedMemberIds, completionCountsByClass, setLeaderboardOptIn,
} from '../db/store';
import { leaderboardFromAgg, lbDisplayName } from '../domain/leaderboard';
import { gradeObjective, gradeFreetext } from '../skills/assess';
import { bktUpdate, defaultBkt, type Bkt } from '../domain/mastery';
import { buildCoursePack } from '../skills/ingest';
import { extractText } from '../skills/extract';
import type { CoursePack } from '../domain/types';
import { renderQuest, renderExpired, renderNotice } from '../pages/quest';
import { renderBoard } from '../pages/board';
import { renderNewClass } from '../pages/newclass';
import { renderManage } from '../pages/manage';
import { renderLanding } from '../pages/landing';
import { renderAdmin, renderAdminGate } from '../pages/admin';
import { aggregateClass, cohortInsights, askClass } from '../skills/analytics';
import { selectQuestionsForMember } from '../skills/plan';
import { congratsLine } from '../skills/schedule';
import { growthNudgeClass } from '../scripts/nudge';
import { zalo } from '../zalo/client';
import { MODELS } from '../llm/models';

// ─── Quest lifecycle helpers ───────────────────────────────────────────────────
const questLink = (memberId: string, questId: string) => `${config.BASE_URL}/q/${signQuestLink({ m: memberId, c: questId })}`;
const fmtDate = (d: any) => { try { return new Date(d).toLocaleString('vi-VN', { timeZone: config.TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// Can this member open this quest right now? Reasons map to friendly learner screens.
function questAccess(row: any, attempts: number): { ok: boolean; reason?: string } {
  if (!row.active) return { ok: false, reason: 'inactive' };
  const now = Date.now();
  if (row.opens_at && new Date(row.opens_at).getTime() > now) return { ok: false, reason: 'not_open' };
  if (row.closes_at && new Date(row.closes_at).getTime() < now) return { ok: false, reason: 'closed' };
  if (row.redoable === false && attempts >= 1) return { ok: false, reason: 'done_no_redo' };
  if ((row.max_attempts || 0) > 0 && attempts >= row.max_attempts) return { ok: false, reason: 'no_attempts' };
  return { ok: true };
}
// Currently open for new answers (ignores per-member attempts) — used to gate mid-run submits.
const questOpenNow = (row: any) => questAccess(row, 0).ok;

// Send a quest's link to active members of a class, with a custom intro line. Returns how many got it.
// onlyIncomplete=true → skip members who already completed the quest (for reminders).
async function sendQuestToMembers(
  cls: any, row: { id: string; title: string; closes_at?: any },
  opts: { intro: string; onlyIncomplete?: boolean },
): Promise<number> {
  const members = await listMembers(cls.id);
  const done = opts.onlyIncomplete ? new Set(await completedMemberIds(row.id)) : new Set<string>();
  const deadline = row.closes_at ? `\n⏰ Hạn: {orange}${fmtDate(row.closes_at)}{/orange}` : '';
  let sent = 0;
  for (const m of members) {
    if (!m.chat_id || (m.status && m.status !== 'active')) continue;
    if (done.has(m.id)) continue;
    try {
      await zalo.sendMessage(m.chat_id, `${opts.intro}${deadline}\n👉 ${questLink(m.id, row.id)}`, { parseMode: 'markdown' });
      sent++;
    } catch (e) { console.error('sendQuestToMembers error:', e); }
  }
  return sent;
}
// Notify EVERY active member about a quest (creation / assign / resend).
const broadcastQuest = (cls: any, row: { id: string; title: string; closes_at?: any }) =>
  sendQuestToMembers(cls, row, { intro: `{big}⚔️ Nhiệm vụ mới!{/big}\nLớp {orange}${cls.name}{/orange} có nhiệm vụ: {orange}${row.title}{/orange}` });

// GET /q/:token — the learner's quest page (token-gated, no login).
export async function questPage(req: Request, res: Response) {
  const p = verifyLink(req.params.token);
  if (!p) return res.status(200).type('html').send(renderExpired());
  const [course, member, row] = await Promise.all([getCoursePack(p.c), getMember(p.m), getQuestRow(p.c)]);
  if (!course || !member || !row) return res.status(200).type('html').send(renderExpired());

  // Lifecycle gate: inactive / scheduled / closed / out-of-attempts → a friendly screen.
  const attempts = await getQuestAttempts(member.id, row.id);
  const acc = questAccess(row, attempts);
  if (!acc.ok) {
    const info = acc.reason === 'not_open' ? fmtDate(row.opens_at) : acc.reason === 'closed' ? fmtDate(row.closes_at) : '';
    return res.type('html').send(renderNotice(acc.reason!, info));
  }

  // Adaptive: skip mastered concepts, weakest first, difficulty matched to the member's BKT mastery.
  // Seed = member + attempt ⇒ different learners (and each new attempt) get a different, spread-out
  // sample from the pool, while a single attempt stays stable across reloads.
  const personalized = { ...course, questions: selectQuestionsForMember(course, member.mastery || {}, `${member.id}:${attempts}`) };
  // All concepts mastered ⇒ count as completed (idempotent, no attempt inflation) so it shows in X/Y + skips reminders.
  if (personalized.questions.length === 0) await ensureQuestCompleted(member.id, row.id);

  // Leaderboard for this learner: ranked by mastery over this quest's concepts; peers anonymized unless
  // they opted in, the viewer always sees their own row. Top 8 + the viewer's own row if it falls below.
  const lb = leaderboardFromAgg(await aggregateClass(member.class_id, course));
  const toRow = (e: typeof lb[number]) => ({ rank: e.rank, name: lbDisplayName(e, member.id), mastery: Math.round(e.mastery * 100), you: e.id === member.id });
  const leaderboard = lb.slice(0, 8).map(toRow);
  const me = lb.find((e) => e.id === member.id);
  if (me && me.rank > 8) leaderboard.push(toRow(me));

  res.type('html').send(renderQuest(personalized, member, req.params.token, {
    title: course.title,
    closesAt: row.closes_at ? fmtDate(row.closes_at) : null,
    redoable: row.redoable !== false,
    attemptsLeft: (row.max_attempts || 0) > 0 ? Math.max(0, row.max_attempts - attempts) : null,
    leaderboard,
    optedIn: !!(member.engagement && member.engagement.lb),
  }));
}

// POST /api/answer — grade an answer, update BKT mastery + XP, log the event.
export async function submitAnswer(req: Request, res: Response) {
  const { token, questionId, answer } = (req.body || {}) as { token?: string; questionId?: string; answer?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false, error: 'expired' });
  const [course, member, row] = await Promise.all([getCoursePack(p.c), getMember(p.m), getQuestRow(p.c)]);
  if (!course || !member || !row) return res.status(404).json({ ok: false });
  if (!questOpenNow(row)) return res.status(403).json({ ok: false, error: 'closed' }); // coach turned it off / deadline passed
  const qn = course.questions.find((x) => x.id === questionId);
  if (!qn) return res.status(404).json({ ok: false, error: 'question' });

  let correct: boolean;
  let score: number;
  let feedback = '';
  if (qn.type === 'mcq') {
    const g = gradeObjective(qn, String(answer ?? ''));
    correct = g.correct;
    score = g.score;
  } else {
    const g = await gradeFreetext(qn, String(answer ?? ''), course.language);
    correct = g.correct;
    score = g.score;
    feedback = g.feedback;
  }

  // BKT mastery — updates on every answer (re-practice still teaches; only XP is gated).
  const mastery: Record<string, Bkt> = member.mastery || {};
  mastery[qn.conceptId] = bktUpdate(mastery[qn.conceptId] || defaultBkt(), correct);
  // XP — granted ONCE per question (first correct answer only). Redoing a quest can't farm XP/level.
  const firstCorrect = correct && !(await hasCorrectAnswer(member.id, qn.id));
  const xpGain = firstCorrect ? 20 : 0;
  const eng: Record<string, number> = member.engagement || {};
  if (xpGain) eng.xp = (eng.xp || 0) + xpGain;
  eng.level = Math.floor((eng.xp || 0) / 100) + 1;

  await upsertMember({
    id: member.id, classId: member.class_id, chatId: member.chat_id, name: member.name,
    role: member.role, lang: member.lang, status: member.status,
    profile: member.profile, mastery, engagement: eng,
  });
  await recordEvent({
    memberId: member.id, classId: member.class_id,
    skill: qn.type === 'mcq' ? 'assess.grade_objective' : 'assess.grade_freetext',
    conceptId: qn.conceptId, questionId: qn.id, score,
    model: qn.type === 'mcq' ? 'code' : MODELS.tutor,
  });

  res.json({
    ok: true, correct, score, feedback, explanation: qn.explanation, answer: qn.answer,
    xp: eng.xp || 0, xpGain, level: eng.level, mastery: Math.round(mastery[qn.conceptId].pL * 100),
  });
}

// Local day string (YYYY-MM-DD) in the app timezone — for the daily streak.
const dayKey = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: config.TZ });

// POST /api/quest/complete — learner finished a run: record the attempt + advance the daily streak.
export async function completeQuestHandler(req: Request, res: Response) {
  const { token } = (req.body || {}) as { token?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const [member, quest] = await Promise.all([getMember(p.m), getQuestRow(p.c)]);
  if (!member || !quest) return res.status(404).json({ ok: false });
  // Integrity: only record a completion if they've actually answered ≥1 of this quest's questions.
  const questionIds = (quest.questions || []).map((x: any) => x.id);
  if (!(await hasAnsweredQuest(member.id, questionIds))) return res.status(400).json({ ok: false, error: 'no_answers' });

  // Mastery now = avg BKT pL over THIS quest's concepts (ids are namespaced per quest → match
  // member.mastery keys). Snapshot it per run so redos can celebrate the real improvement vs last time.
  const cids: string[] = (quest.concepts || []).map((c: any) => c.id);
  const mm: Record<string, { pL?: number }> = member.mastery || {};
  const masteryNow = cids.length ? Math.round((100 * cids.reduce((s, id) => s + (mm[id]?.pL ?? 0), 0)) / cids.length) : 0;
  const prev = await questRunStats(member.id, p.c);   // attempts + last mastery% BEFORE this run
  await recordQuestCompletion(member.id, p.c, masteryNow);

  // Daily streak: +1 if last active was yesterday, reset to 1 on a gap, unchanged if already today.
  const eng: Record<string, any> = member.engagement || {};
  const today = dayKey(Date.now());
  if (eng.lastDay !== today) {
    const yesterday = dayKey(Date.now() - 86400000);
    eng.streak = eng.lastDay === yesterday ? (eng.streak || 0) + 1 : 1;
    eng.lastDay = today;
    await upsertMember({
      id: member.id, classId: member.class_id, chatId: member.chat_id, name: member.name,
      role: member.role, lang: member.lang, status: member.status,
      profile: member.profile, mastery: member.mastery, engagement: eng,
    });
  }

  // Congrats / motivation → the learner's Zalo. On a redo, highlight the real improvement vs last time.
  // Fire-and-forget: never block or fail the completion response on the AI/Zalo call.
  if (member.chat_id) {
    const chatId = member.chat_id;
    const redo = prev.attempts > 0;
    const haveBaseline = prev.lastMastery > 0;          // avoid false deltas from pre-existing runs (baseline 0)
    const delta = masteryNow - prev.lastMastery;
    const level = Math.floor((eng.xp || 0) / 100) + 1;
    congratsLine({
      name: member.name, courseTitle: quest.title || 'nhiệm vụ', level, streak: eng.streak,
      redo, masteryNow, masteryDelta: haveBaseline ? delta : undefined,
    })
      .then((line) => {
        const bits = [`🏆 Cấp ${level}`, `${eng.xp || 0} XP`];
        if (cids.length) bits.push(`🎯 ${masteryNow}% thành thạo`);
        if ((eng.streak || 0) >= 2) bits.push(`🔥 ${eng.streak} ngày`);
        if (redo && haveBaseline && delta > 0) bits.push(`📈 +${delta}% so với lần trước`);
        return zalo.sendMessage(chatId, `${line}\n${bits.join(' · ')}`, { parseMode: 'markdown' });
      })
      .catch(() => {});
  }
  res.json({ ok: true, streak: eng.streak || 0 });
}

// The quest the dashboard / ask-your-class analyzes. Falls back to the most recent quest (active OR
// not) so toggling a quest inactive never blanks the analytics — answers/mastery are intact, they
// just need a concept list to render against.
async function analysisCourse(cls: any) {
  const id = cls.active_quest_id || cls.course_id || (await mostRecentQuest(cls.id));
  return id ? await getCoursePack(id) : null;
}

// GET /board/:token — Coach's Board (token.c = classId).
export async function boardPage(req: Request, res: Response) {
  const p = verifyLink(req.params.token);
  if (!p) return res.status(200).type('html').send(renderExpired());
  const cls = await getClass(p.c);
  if (!cls) return res.status(200).type('html').send(renderExpired());
  const course = await analysisCourse(cls);
  const [agg, waitlist] = await Promise.all([aggregateClass(cls.id, course), listWaitlist(cls.id)]);
  const insight = await cohortInsights(agg, cls.name);
  res.type('html').send(renderBoard(cls.name, agg, insight, req.params.token, {
    visibility: cls.visibility,
    inviteCode: cls.invite_code,
    waitlist: waitlist.map((m: any) => ({ id: m.id, name: m.name || m.id, role: m.role })),
  }));
}

// POST /api/ask — ask-your-class (NL question over the class data).
export async function askHandler(req: Request, res: Response) {
  const { token, question } = (req.body || {}) as { token?: string; question?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const course = await analysisCourse(cls);
  const agg = await aggregateClass(cls.id, course);
  const answer = await askClass(String(question || ''), agg, cls.name);
  res.json({ ok: true, answer });
}

// POST /api/approve — Coach approves a waitlisted member; the bot DMs them their quest link.
export async function approveHandler(req: Request, res: Response) {
  const { token, memberId } = (req.body || {}) as { token?: string; memberId?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const m = await getMember(memberId || '');
  if (!m || m.class_id !== cls.id) return res.status(404).json({ ok: false });
  await approveMember(m.id);
  if (m.chat_id) {
    const quests = await activeOpenQuests(cls.id); // catch them up on EVERY active quest, not just one
    if (quests.length) {
      const header = `{big}🎉 Đã được duyệt!{/big}\nBạn đã vào lớp {orange}${cls.name}{/orange}.\n\n{green}Nhiệm vụ của bạn:{/green}`;
      const blocks = quests.map((z: any) => `• {orange}${z.title}{/orange}${z.closes_at ? ` (hạn ${fmtDate(z.closes_at)})` : ''}\n👉 ${questLink(m.id, z.id)}`);
      for (const msg of chunkQuestMessages(header, blocks)) zalo.sendMessage(m.chat_id, msg, { parseMode: 'markdown' }).catch(() => {});
    } else {
      zalo.sendMessage(m.chat_id, `{big}🎉 Đã được duyệt!{/big}\nBạn đã vào lớp {orange}${cls.name}{/orange}.\nNgười dẫn đường sẽ giao nhiệm vụ sớm nhé.`, { parseMode: 'markdown' }).catch(() => {});
    }
  }
  res.json({ ok: true, memberId: m.id });
}

// POST /api/visibility — Coach toggles the class public/private.
export async function visibilityHandler(req: Request, res: Response) {
  const { token, visibility } = (req.body || {}) as { token?: string; visibility?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const v = visibility === 'public' ? 'public' : 'private';
  await setVisibility(cls.id, v);
  res.json({ ok: true, visibility: v });
}

// GET / — public landing page (the entry point).
export function landingPage(_req: Request, res: Response) {
  res.type('html').send(renderLanding());
}

// GET /new — Coach self-serve class creation page.
export function newClassPage(_req: Request, res: Response) {
  res.type('html').send(renderNewClass());
}

// POST /api/class — create an (empty) class. Coach then uploads Materials + builds Quests.
export async function createClassHandler(req: Request, res: Response) {
  const { name, visibility, k } = (req.body || {}) as { name?: string; visibility?: string; k?: string };
  // If launched from the bot, `k` carries the Coach's verified Zalo id → bind automatically.
  let coachChatId: string | undefined;
  if (k) { const cp = verifyLink(String(k)); if (cp) coachChatId = cp.m; }
  const className = (name && String(name).trim()) || 'Lớp mới';
  const classId = newId('class');
  const inviteCode = newId('join');
  const linkCode = newId('coach');
  await createClass({ id: classId, name: className, visibility: visibility === 'public' ? 'public' : 'private', inviteCode, linkCode, coachChatId });
  const coachToken = signLink({ m: 'coach', c: classId });
  const manageUrl = `${config.BASE_URL}/manage/${coachToken}`;
  const boardUrl = `${config.BASE_URL}/board/${coachToken}`;
  // We know the Coach's Zalo — push the links into the chat so they're never lost on close.
  if (coachChatId) {
    zalo.sendMessage(coachChatId, `{big}✅ Đã tạo lớp!{/big}\nLớp: {orange}${className}{/orange}\n\n📂 Quản lý: ${manageUrl}\n📋 Bảng điều khiển: ${boardUrl}\n🎟 Mã mời học viên: {orange}${inviteCode}{/orange}`, { parseMode: 'markdown' }).catch(() => {});
  }
  res.json({ ok: true, classId, name: className, inviteCode, linkCode, manageUrl, boardUrl, bound: !!coachChatId });
}

// Make concept/question ids globally unique to this quest, so per-member mastery never
// collides across multiple quests in the same class.
function namespacePack(cp: CoursePack): CoursePack {
  const prefix = cp.id.replace(/[^a-z0-9]/gi, '').slice(-6);
  const map: Record<string, string> = {};
  cp.concepts.forEach((c) => { const nid = `${prefix}_${c.id}`; map[c.id] = nid; c.id = nid; });
  cp.questions.forEach((qn) => { qn.conceptId = map[qn.conceptId] || qn.conceptId; qn.id = `${prefix}_${qn.id}`; });
  return cp;
}

// GET /manage/:token — Coach class management: upload Materials, build Quests.
export async function managePage(req: Request, res: Response) {
  const p = verifyLink(req.params.token);
  if (!p) return res.status(200).type('html').send(renderExpired());
  const cls = await getClass(p.c);
  if (!cls) return res.status(200).type('html').send(renderExpired());
  const [materials, quests, allMembers, doneCounts] = await Promise.all([
    listMaterials(cls.id), listQuests(cls.id), listMembers(cls.id), completionCountsByClass(cls.id),
  ]);
  res.type('html').send(renderManage({
    token: req.params.token,
    className: cls.name,
    inviteCode: cls.invite_code,
    activeQuestId: cls.active_quest_id || cls.course_id || null,
    materials: materials.map((m: any) => ({ id: m.id, title: m.title, chars: m.source_chars || 0 })),
    quests: quests.map((qq: any) => ({
      id: qq.id, title: qq.title, concepts: (qq.concepts || []).length, questions: (qq.questions || []).length, materialIds: qq.material_ids || [],
      active: qq.active !== false, redoable: qq.redoable !== false, maxAttempts: qq.max_attempts || 0,
      opensAt: qq.opens_at ? new Date(qq.opens_at).toISOString() : null,
      closesAt: qq.closes_at ? new Date(qq.closes_at).toISOString() : null,
      completed: doneCounts[qq.id] || 0,
    })),
    members: allMembers.filter((m: any) => (m.status ?? 'active') === 'active').map((m: any) => ({ name: m.name || m.id, role: m.role })),
    waitlist: allMembers.filter((m: any) => m.status === 'waitlist').map((m: any) => ({ id: m.id, name: m.name || m.id, role: m.role })),
  }));
}

// POST /api/material — add a document to the class library.
export async function addMaterialHandler(req: Request, res: Response) {
  const { token, title, content } = (req.body || {}) as { token?: string; title?: string; content?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  if (!content || String(content).trim().length < 20) return res.status(400).json({ ok: false, error: 'Nội dung quá ngắn.' });
  const id = newId('mat');
  await addMaterial({ id, classId: cls.id, title: (title && String(title).trim()) || 'Tài liệu', content: String(content) });
  res.json({ ok: true, id });
}

// POST /api/material/upload — multipart file (PDF/DOCX/TXT) → extract text → add as a material.
export async function uploadMaterialHandler(req: Request, res: Response) {
  const file = (req as any).file as { buffer: Buffer; originalname: string; mimetype: string } | undefined;
  const body = (req.body || {}) as { token?: string; title?: string };
  const p = verifyLink(body.token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  if (!file) return res.status(400).json({ ok: false, error: 'Không có tệp.' });
  try {
    const text = (await extractText(file.buffer, file.originalname)).slice(0, 60000);
    if (text.trim().length < 20) return res.status(400).json({ ok: false, error: 'Không trích xuất được nội dung từ tệp.' });
    const title = (body.title && body.title.trim()) || file.originalname.replace(/\.[^.]+$/, '');
    const id = newId('mat');
    await addMaterial({ id, classId: cls.id, title, content: text });
    res.json({ ok: true, id, title, chars: text.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Lỗi xử lý tệp' });
  }
}

// POST /api/quest — build a Quest from selected Materials, then set it as the active Quest.
export async function createQuestHandler(req: Request, res: Response) {
  const { token, name, materialIds, instructions } = (req.body || {}) as { token?: string; name?: string; materialIds?: string[]; instructions?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const ids = Array.isArray(materialIds) ? materialIds.filter((x) => typeof x === 'string') : [];
  const mats = await getMaterialsByIds(ids);
  if (!mats.length) return res.status(400).json({ ok: false, error: 'Chọn ít nhất một tài liệu.' });
  try {
    const combined = mats.map((m) => `# ${m.title}\n${m.content}`).join('\n\n').slice(0, 24000);
    const cp = namespacePack(await buildCoursePack(combined, { instructions: instructions ? String(instructions).slice(0, 600) : '' }));
    if (name && String(name).trim()) cp.title = String(name).trim();
    await saveCoursePack(cp, cls.id, ids); // active=true by default
    await setActiveQuest(cls.id, cp.id);
    // "Sent upon creation": push the new quest to every active member right away.
    const sent = await broadcastQuest(cls, { id: cp.id, title: cp.title, closes_at: null });
    res.json({ ok: true, questId: cp.id, title: cp.title, concepts: cp.concepts.length, questions: cp.questions.length, sent });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Lỗi tạo nhiệm vụ' });
  }
}

// A valid admin token is a signed link with subject 'admin' bound to the configured owner chat.
// Can't be forged without JWT_SECRET, expires fast, and is only ever issued to the owner via the bot.
function isAdminToken(token: string): boolean {
  const p = verifyLink(token);
  return !!p && p.m === 'admin' && !!config.OWNER_CHAT_ID && p.c === config.OWNER_CHAT_ID;
}

// GET /admin?t=… — system-wide overview (owner-only, bot-issued token).
export async function adminPage(req: Request, res: Response) {
  const token = String(req.query.t || '');
  if (!isAdminToken(token)) return res.status(401).type('html').send(renderAdminGate());
  const ov = await adminOverview();
  const classes = ov.classes.map((c: any) => {
    const ct = signLink({ m: 'coach', c: c.id });
    return { id: c.id, name: c.name, owner: c.owner_name, visibility: c.visibility, members: c.members, quests: c.quests, materials: c.materials, inviteCode: c.invite_code, manageUrl: `${config.BASE_URL}/manage/${ct}`, boardUrl: `${config.BASE_URL}/board/${ct}` };
  });
  res.type('html').send(renderAdmin({ token, totals: ov.totals, classes }));
}

// POST /api/admin/delete-class — cascade delete a class (owner-only).
export async function deleteClassHandler(req: Request, res: Response) {
  const { t, classId } = (req.body || {}) as { t?: string; classId?: string };
  if (!isAdminToken(t || '')) return res.status(401).json({ ok: false, error: 'Không có quyền' });
  if (!classId) return res.status(400).json({ ok: false, error: 'thiếu classId' });
  await deleteClassCascade(classId);
  res.json({ ok: true });
}

// POST /api/admin/nudge — demo trigger: fire the personalized daily re-engagement reminder for a class
// NOW instead of waiting on cron (owner-only). Mirrors what scripts/nudge.ts does on its schedule.
export async function adminNudgeHandler(req: Request, res: Response) {
  const { t, classId } = (req.body || {}) as { t?: string; classId?: string };
  if (!isAdminToken(t || '')) return res.status(401).json({ ok: false, error: 'Không có quyền' });
  if (!classId) return res.status(400).json({ ok: false, error: 'thiếu classId' });
  try {
    const r = await growthNudgeClass(classId);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Lỗi' });
  }
}

// POST /api/leaderboard/optin — learner toggles whether their name is shown to peers on the leaderboard.
// Token is the learner's own quest link (m = memberId), so only they can flip their own flag.
export async function leaderboardOptInHandler(req: Request, res: Response) {
  const { token, on } = (req.body || {}) as { token?: string; on?: boolean };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const member = await getMember(p.m);
  if (!member) return res.status(404).json({ ok: false });
  await setLeaderboardOptIn(member.id, !!on);
  res.json({ ok: true, optedIn: !!on });
}

// POST /api/quest/activate — assign a quest: turn it on, feature it, and notify every active member.
export async function activateQuestHandler(req: Request, res: Response) {
  const { token, questId } = (req.body || {}) as { token?: string; questId?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const quest = await getQuestRow(questId || '');
  if (!quest || quest.class_id !== cls.id) return res.status(404).json({ ok: false });
  await setQuestActive(quest.id, true);
  await setActiveQuest(cls.id, quest.id);
  const sent = await broadcastQuest(cls, quest);
  res.json({ ok: true, activeQuestId: quest.id, sent });
}

// POST /api/quest/toggle — turn a quest on/off WITHOUT notifying (the active/inactive switch).
export async function toggleQuestHandler(req: Request, res: Response) {
  const { token, questId, active } = (req.body || {}) as { token?: string; questId?: string; active?: boolean };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const quest = await getQuestRow(questId || '');
  if (!quest || quest.class_id !== cls.id) return res.status(404).json({ ok: false });
  await setQuestActive(quest.id, !!active);
  await setActiveQuest(cls.id, await mostRecentActiveQuest(cls.id)); // keep "featured" pointing at a live quest (or null)
  res.json({ ok: true, active: !!active });
}

// POST /api/quest/resend — re-broadcast a quest's link to active members (a manual "boost").
export async function resendQuestHandler(req: Request, res: Response) {
  const { token, questId } = (req.body || {}) as { token?: string; questId?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const quest = await getQuestRow(questId || '');
  if (!quest || quest.class_id !== cls.id) return res.status(404).json({ ok: false });
  const sent = await broadcastQuest(cls, quest);
  res.json({ ok: true, sent });
}

// POST /api/quest/remind — nudge ONLY the active members who haven't completed this quest yet.
export async function remindQuestHandler(req: Request, res: Response) {
  const { token, questId } = (req.body || {}) as { token?: string; questId?: string };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const quest = await getQuestRow(questId || '');
  if (!quest || quest.class_id !== cls.id) return res.status(404).json({ ok: false });
  const sent = await sendQuestToMembers(cls, quest, {
    intro: `{big}🔔 Nhắc nhẹ nha!{/big}\nBạn chưa hoàn thành nhiệm vụ {orange}${quest.title}{/orange} ở lớp {orange}${cls.name}{/orange}.`,
    onlyIncomplete: true,
  });
  res.json({ ok: true, sent });
}

// POST /api/quest/config — update redo / max-attempts / open-close window for a quest.
export async function configQuestHandler(req: Request, res: Response) {
  const { token, questId, redoable, maxAttempts, opensAt, closesAt } = (req.body || {}) as
    { token?: string; questId?: string; redoable?: boolean; maxAttempts?: number; opensAt?: string | null; closesAt?: string | null };
  const p = verifyLink(token || '');
  if (!p) return res.status(401).json({ ok: false });
  const cls = await getClass(p.c);
  if (!cls) return res.status(404).json({ ok: false });
  const quest = await getQuestRow(questId || '');
  if (!quest || quest.class_id !== cls.id) return res.status(404).json({ ok: false });
  const opens = opensAt || null, closes = closesAt || null;
  if (opens && closes && new Date(closes).getTime() <= new Date(opens).getTime())
    return res.status(400).json({ ok: false, error: 'Hạn chót phải sau giờ mở.' });
  // Scheduled to open in the future ⇒ un-announce so the scheduler sends the "now open" ping at open time.
  const openAnnounced = !opens || new Date(opens).getTime() <= Date.now();
  await setQuestConfig(quest.id, {
    redoable: redoable !== false,
    maxAttempts: Math.max(0, Math.floor(Number(maxAttempts) || 0)),
    opensAt: opens, closesAt: closes, openAnnounced,
  });
  res.json({ ok: true });
}
