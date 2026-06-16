import { dueScheduledQuests, markQuestAnnounced, getClass, listMembers } from '../db/store';
import { signQuestLink } from '../domain/links';
import { zalo } from '../zalo/client';
import { config } from '../config';
import { pool } from '../db/client';

// Scheduled-open tick: any quest whose opens_at has arrived but hasn't been announced yet gets a
// "now open!" ping to its class's active members. Idempotent — each quest is announced once.
// Usage: npx tsx src/scripts/open-due.ts   (point a cron at this every few minutes)
const fmtDate = (d: any) => { try { return new Date(d).toLocaleString('vi-VN', { timeZone: config.TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

(async () => {
  const due = await dueScheduledQuests();
  console.log(`Scheduled-open tick → ${due.length} quest(s) due.`);
  for (const qz of due) {
    const cls = await getClass(qz.class_id);
    if (!cls) { await markQuestAnnounced(qz.id); continue; }
    const members = await listMembers(qz.class_id);
    const deadline = qz.closes_at ? `\n⏰ Hạn: {orange}${fmtDate(qz.closes_at)}{/orange}` : '';
    let sent = 0;
    for (const m of members) {
      if (!m.chat_id || (m.status && m.status !== 'active')) continue;
      const url = `${config.BASE_URL}/q/${signQuestLink({ m: m.id, c: qz.id })}`;
      try {
        await zalo.sendMessage(m.chat_id, `{big}🚀 Nhiệm vụ đã mở!{/big}\nLớp {orange}${cls.name}{/orange}: {orange}${qz.title}{/orange}${deadline}\n👉 ${url}`, { parseMode: 'markdown' });
        sent++;
      } catch (e) { console.error('open-due send error:', e instanceof Error ? e.message : e); }
    }
    await markQuestAnnounced(qz.id); // mark even if 0 sent, so we don't re-tick this quest forever
    console.log(`✅ ${qz.title} → ${sent} member(s)`);
  }
  await pool.end();
})().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
