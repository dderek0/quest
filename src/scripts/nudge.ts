import { listMembers, getClass, getCoursePack, lastActiveByMember } from '../db/store';
import { growthHook } from '../skills/schedule';
import { weakestConcept } from '../skills/plan';
import { signQuestLink } from '../domain/links';
import { zalo } from '../zalo/client';
import { config } from '../config';
import { pool } from '../db/client';

// The proactive "game noti" tick: nudge every member of a class with their quest link.
// Usage: npx tsx src/scripts/nudge.ts <classId>   (cron will call this later)
(async () => {
  const classId = process.argv[2];
  if (!classId) throw new Error('usage: nudge.ts <classId>');
  const cls = await getClass(classId);
  if (!cls) throw new Error('class not found: ' + classId);
  const activeId = cls.active_quest_id || cls.course_id;
  const course = activeId ? await getCoursePack(activeId) : null;
  const total = course?.concepts.length || 0;
  const [members, lastActive] = await Promise.all([listMembers(classId), lastActiveByMember(classId)]);
  console.log(`Growth nudge for "${cls.name}" → ${members.length} member(s)…`);

  for (const m of members) {
    if (!m.chat_id || (m.status && m.status !== 'active')) continue;
    const mastery = m.mastery || {};
    const eng = m.engagement || {};
    const ms = lastActive[m.id] || 0;
    // Build this member's profile, then let the growth agent pick the angle + write the hook.
    const hook = await growthHook({
      name: m.name, role: m.role,
      level: eng.level, streak: eng.streak,
      xpToNext: eng.xp != null ? 100 - (eng.xp % 100) : undefined,
      weakestConcept: course ? weakestConcept(course, mastery) : undefined,
      mastered: course ? course.concepts.filter((c) => (mastery[c.id]?.pL || 0) >= 0.8).length : 0,
      total,
      daysSinceActive: ms ? Math.floor((Date.now() - ms) / 86400000) : 0,
    }, cls.name);
    const link = activeId ? `\n👉 ${config.BASE_URL}/q/${signQuestLink({ m: m.id, c: activeId })}` : '';
    try {
      await zalo.sendMessage(m.chat_id, hook + link, { parseMode: 'markdown' });
      console.log('✅', m.name || m.id);
    } catch (e) {
      console.log('❌', m.id, e instanceof Error ? e.message : e);
    }
  }
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
