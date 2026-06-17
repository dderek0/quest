import { q } from './client';
import type { CoursePack } from '../domain/types';

// ─── Course Packs ────────────────────────────────────────────────────────────
export async function saveCoursePack(cp: CoursePack, classId?: string, materialIds?: string[]): Promise<string> {
  await q(
    `insert into course_packs (id,class_id,title,summary,language,source_chars,concepts,questions,material_ids)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do update set
       class_id=excluded.class_id, title=excluded.title, summary=excluded.summary,
       language=excluded.language, source_chars=excluded.source_chars,
       concepts=excluded.concepts, questions=excluded.questions, material_ids=excluded.material_ids`,
    [cp.id, classId ?? null, cp.title, cp.summary, cp.language, cp.sourceChars,
     JSON.stringify(cp.concepts), JSON.stringify(cp.questions), JSON.stringify(materialIds ?? cp.materialIds ?? [])],
  );
  return cp.id;
}

export async function getCoursePack(id: string): Promise<CoursePack | null> {
  const { rows } = await q(`select * from course_packs where id=$1`, [id]);
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, title: r.title, summary: r.summary, language: r.language,
    sourceChars: r.source_chars, concepts: r.concepts, questions: r.questions, materialIds: r.material_ids ?? [] };
}

// Quests (= CoursePacks) belonging to a class, newest first (with lifecycle fields for the manage UI).
export const listQuests = async (classId: string) =>
  (await q(`select id,title,concepts,questions,material_ids,active,redoable,max_attempts,opens_at,closes_at,created_at from course_packs where class_id=$1 order by created_at desc`, [classId])).rows;

// Raw quest row incl. lifecycle (active/window/attempts config + class_id) — used for gating & broadcasts.
export const getQuestRow = async (id: string) => (await q(`select * from course_packs where id=$1`, [id])).rows[0] ?? null;

// Quests a learner can currently do: active AND inside their time window (newest first, capped).
export const activeOpenQuests = async (classId: string) =>
  (await q(
    `select id,title,closes_at from course_packs
     where class_id=$1 and active=true
       and (opens_at is null or opens_at<=now())
       and (closes_at is null or closes_at>=now())
     order by created_at desc limit 8`, [classId])).rows;

export const setQuestActive = async (id: string, active: boolean) => { await q(`update course_packs set active=$1 where id=$2`, [active, id]); };
export const setQuestConfig = async (id: string, c: { redoable: boolean; maxAttempts: number; opensAt: string | null; closesAt: string | null; openAnnounced: boolean }) => {
  await q(`update course_packs set redoable=$1, max_attempts=$2, opens_at=$3, closes_at=$4, open_announced=$5 where id=$6`,
    [c.redoable, c.maxAttempts, c.opensAt, c.closesAt, c.openAnnounced, id]);
};
// Scheduled quests whose open time has arrived but the "now open" ping hasn't gone out yet (cron tick).
export const dueScheduledQuests = async () =>
  (await q(`select id, class_id, title, closes_at from course_packs
     where active=true and open_announced=false and opens_at is not null and opens_at<=now()
       and (closes_at is null or closes_at>=now())`)).rows;
export const markQuestAnnounced = async (id: string) => { await q(`update course_packs set open_announced=true where id=$1`, [id]); };
// Most recent still-active quest in a class — the served/nudge default (must be a live quest).
export const mostRecentActiveQuest = async (classId: string): Promise<string | null> =>
  (await q(`select id from course_packs where class_id=$1 and active=true order by created_at desc limit 1`, [classId])).rows[0]?.id ?? null;
// Most recent quest in a class REGARDLESS of active state — the dashboard's analysis fallback, so
// toggling a quest inactive never blanks the board (historical mastery still has a concept list).
export const mostRecentQuest = async (classId: string): Promise<string | null> =>
  (await q(`select id from course_packs where class_id=$1 order by created_at desc limit 1`, [classId])).rows[0]?.id ?? null;

// Completed-run counter per (member, quest) — drives redo / max-attempts gating.
export const getQuestAttempts = async (memberId: string, questId: string): Promise<number> =>
  (await q(`select attempts from quest_runs where member_id=$1 and quest_id=$2`, [memberId, questId])).rows[0]?.attempts ?? 0;
// Prior run stats for a (member, quest): completed-attempt count + last recorded mastery% — to celebrate redo improvement.
export const questRunStats = async (memberId: string, questId: string): Promise<{ attempts: number; lastMastery: number }> => {
  const r = (await q(`select attempts, last_mastery from quest_runs where member_id=$1 and quest_id=$2`, [memberId, questId])).rows[0];
  return { attempts: r?.attempts ?? 0, lastMastery: r?.last_mastery ?? 0 };
};
// member ids who have completed (≥1 run of) a quest — to target reminders at those who haven't.
export const completedMemberIds = async (questId: string): Promise<string[]> =>
  (await q(`select member_id from quest_runs where quest_id=$1 and completed=true`, [questId])).rows.map((r) => r.member_id);

// quest_id → how many distinct members completed it, for every quest in a class (one query, for the manage UI).
export const completionCountsByClass = async (classId: string): Promise<Record<string, number>> => {
  const { rows } = await q(
    `select qr.quest_id, count(*)::int n
     from quest_runs qr join course_packs cp on cp.id = qr.quest_id
     where cp.class_id=$1 and qr.completed=true
     group by qr.quest_id`, [classId]);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.quest_id] = r.n;
  return out;
};
export const recordQuestCompletion = async (memberId: string, questId: string, mastery = 0) => {
  await q(
    `insert into quest_runs (member_id,quest_id,attempts,completed,last_mastery,updated_at) values ($1,$2,1,true,$3,now())
     on conflict (member_id,quest_id) do update set attempts=quest_runs.attempts+1, completed=true, last_mastery=$3, updated_at=now()`,
    [memberId, questId, mastery]);
};
// Idempotent "mark completed" WITHOUT inflating attempts — for the all-mastered case (page may reload).
export const ensureQuestCompleted = async (memberId: string, questId: string) => {
  await q(
    `insert into quest_runs (member_id,quest_id,attempts,completed,updated_at) values ($1,$2,1,true,now())
     on conflict (member_id,quest_id) do update set completed=true, updated_at=now()`,
    [memberId, questId]);
};
// Has this member answered ≥1 question belonging to a quest? Guards /complete against being faked.
export const hasAnsweredQuest = async (memberId: string, questionIds: string[]): Promise<boolean> => {
  if (!questionIds.length) return false;
  const { rows } = await q(`select 1 from events where member_id=$1 and question_id = any($2) limit 1`, [memberId, questionIds]);
  return rows.length > 0;
};
// Did this member already answer THIS question correctly (score ≥ 0.6)? → XP is granted once per
// question, so redoing a quest can't farm XP / inflate level.
export const hasCorrectAnswer = async (memberId: string, questionId: string): Promise<boolean> =>
  (await q(`select 1 from events where member_id=$1 and question_id=$2 and score>=0.6 limit 1`, [memberId, questionId])).rows.length > 0;

// ─── Classes ─────────────────────────────────────────────────────────────────
export async function createClass(c: {
  id: string; name: string; coachChatId?: string; visibility?: string;
  linkCode?: string; inviteCode?: string; courseId?: string; config?: object;
}): Promise<void> {
  await q(
    `insert into classes (id,name,coach_chat_id,visibility,link_code,invite_code,course_id,config)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
    [c.id, c.name, c.coachChatId ?? null, c.visibility ?? 'private', c.linkCode ?? null,
     c.inviteCode ?? null, c.courseId ?? null, JSON.stringify(c.config ?? {})],
  );
}
export const getClass = async (id: string) => (await q(`select * from classes where id=$1`, [id])).rows[0] ?? null;
export const getClassByInvite = async (code: string) => (await q(`select * from classes where invite_code=$1`, [code])).rows[0] ?? null;
export const getClassByLink = async (code: string) => (await q(`select * from classes where link_code=$1`, [code])).rows[0] ?? null;
export const getClassesByCoach = async (chatId: string) => (await q(`select * from classes where coach_chat_id=$1 order by created_at desc`, [chatId])).rows;

// Track latest display name per chat id (refreshed on every inbound message) → shown as class owner.
export async function upsertCoachName(chatId: string, name?: string): Promise<void> {
  if (!chatId || !name) return;
  await q(`insert into coaches (chat_id,name) values ($1,$2) on conflict (chat_id) do update set name=excluded.name, updated_at=now()`, [chatId, name]);
}
export const getCoachName = async (chatId: string) => (await q(`select name from coaches where chat_id=$1`, [chatId])).rows[0]?.name ?? null;
export const bindCoach = async (classId: string, chatId: string) => { await q(`update classes set coach_chat_id=$1 where id=$2`, [chatId, classId]); };
export const setVisibility = async (classId: string, visibility: string) => { await q(`update classes set visibility=$1 where id=$2`, [visibility, classId]); };
export const setActiveQuest = async (classId: string, questId: string | null) => { await q(`update classes set active_quest_id=$1 where id=$2`, [questId, classId]); };

// ─── Members ─────────────────────────────────────────────────────────────────
export async function upsertMember(m: {
  id: string; classId: string; chatId?: string; name?: string; role?: string;
  lang?: string; status?: string; profile?: object; mastery?: object; engagement?: object;
}): Promise<void> {
  await q(
    `insert into members (id,class_id,chat_id,name,role,lang,status,profile,mastery,engagement)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (id) do update set
       name=excluded.name, role=excluded.role, lang=excluded.lang, status=excluded.status,
       profile=excluded.profile, mastery=excluded.mastery, engagement=excluded.engagement`,
    [m.id, m.classId, m.chatId ?? null, m.name ?? null, m.role ?? null, m.lang ?? 'vi',
     m.status ?? 'active', JSON.stringify(m.profile ?? {}), JSON.stringify(m.mastery ?? {}),
     JSON.stringify(m.engagement ?? {})],
  );
}
export const getMember = async (id: string) => (await q(`select * from members where id=$1`, [id])).rows[0] ?? null;
export const listMembers = async (classId: string) => (await q(`select * from members where class_id=$1`, [classId])).rows;
export const getMemberByChat = async (chatId: string) => (await q(`select * from members where chat_id=$1 order by created_at desc limit 1`, [chatId])).rows[0] ?? null;
export const listWaitlist = async (classId: string) => (await q(`select * from members where class_id=$1 and status='waitlist' order by created_at asc`, [classId])).rows;
export const approveMember = async (memberId: string) => { await q(`update members set status='active' where id=$1`, [memberId]); };
// Leaderboard name opt-in — merges the `lb` flag into engagement jsonb without touching xp/level/streak.
export const setLeaderboardOptIn = async (memberId: string, on: boolean) => {
  await q(`update members set engagement = coalesce(engagement,'{}'::jsonb) || jsonb_build_object('lb',$2::boolean) where id=$1`, [memberId, on]);
};

// ─── Events ──────────────────────────────────────────────────────────────────
export async function recordEvent(e: {
  memberId?: string; classId?: string; skill?: string; conceptId?: string;
  questionId?: string; score?: number; model?: string; meta?: object;
}): Promise<void> {
  await q(
    `insert into events (member_id,class_id,skill,concept_id,question_id,score,model,meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [e.memberId ?? null, e.classId ?? null, e.skill ?? null, e.conceptId ?? null,
     e.questionId ?? null, e.score ?? null, e.model ?? null, JSON.stringify(e.meta ?? {})],
  );
}

// ─── Materials ───────────────────────────────────────────────────────────────
export async function addMaterial(m: { id: string; classId: string; title: string; content: string; sourceChars?: number }): Promise<void> {
  await q(`insert into materials (id,class_id,title,content,source_chars) values ($1,$2,$3,$4,$5)`,
    [m.id, m.classId, m.title, m.content, m.sourceChars ?? m.content.length]);
}
export const listMaterials = async (classId: string) =>
  (await q(`select id,title,source_chars,created_at from materials where class_id=$1 order by created_at asc`, [classId])).rows;
export async function getMaterialsByIds(ids: string[]): Promise<{ id: string; title: string; content: string }[]> {
  if (!ids.length) return [];
  const { rows } = await q(`select id,title,content from materials where id = any($1)`, [ids]);
  return rows;
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export async function adminOverview(): Promise<{
  totals: { classes: number; members: number; quests: number; materials: number; events: number };
  classes: any[];
}> {
  const classes = (await q(`select c.id,c.name,c.visibility,c.invite_code,c.active_quest_id,c.course_id,c.coach_chat_id,c.created_at, co.name as owner_name
     from classes c left join coaches co on co.chat_id=c.coach_chat_id
     order by c.created_at desc`)).rows;
  const mem = (await q(`select class_id, count(*)::int n from members group by class_id`)).rows;
  const qz = (await q(`select class_id, count(*)::int n from course_packs where class_id is not null group by class_id`)).rows;
  const mat = (await q(`select class_id, count(*)::int n from materials group by class_id`)).rows;
  const m = (k: any[], by = 'class_id') => Object.fromEntries(k.map((r) => [r[by], r.n]));
  const memMap = m(mem); const qzMap = m(qz); const matMap = m(mat);
  const sum = (k: any[]) => k.reduce((a, r) => a + r.n, 0);
  const events = (await q(`select count(*)::int n from events`)).rows[0]?.n ?? 0;
  return {
    totals: { classes: classes.length, members: sum(mem), quests: sum(qz), materials: sum(mat), events },
    classes: classes.map((c) => ({ ...c, members: memMap[c.id] || 0, quests: qzMap[c.id] || 0, materials: matMap[c.id] || 0 })),
  };
}

export async function deleteClassCascade(classId: string): Promise<void> {
  await q(`delete from quest_runs where quest_id in (select id from course_packs where class_id=$1)`, [classId]);
  await q(`delete from events where class_id=$1`, [classId]);
  await q(`delete from members where class_id=$1`, [classId]);
  await q(`delete from materials where class_id=$1`, [classId]);
  await q(`delete from course_packs where class_id=$1`, [classId]);
  await q(`delete from classes where id=$1`, [classId]);
}

// last activity time per member (ms epoch) — drives the "days since active" growth signal.
export async function lastActiveByMember(classId: string): Promise<Record<string, number>> {
  const { rows } = await q(`select member_id, max(ts) as ts from events where class_id=$1 and member_id is not null group by member_id`, [classId]);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.member_id] = r.ts ? new Date(r.ts).getTime() : 0;
  return out;
}

// answered + correct counts per member, for analytics.
export async function eventStatsByMember(classId: string): Promise<Record<string, { answered: number; correct: number }>> {
  const { rows } = await q(
    `select member_id, count(*)::int answered, sum(case when score>=0.6 then 1 else 0 end)::int correct
     from events where class_id=$1 and member_id is not null group by member_id`,
    [classId],
  );
  const out: Record<string, { answered: number; correct: number }> = {};
  for (const r of rows) out[r.member_id] = { answered: r.answered, correct: Number(r.correct) || 0 };
  return out;
}
