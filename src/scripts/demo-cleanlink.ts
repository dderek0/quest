import { zalo } from '../zalo/client';
import { config } from '../config';

// Compare ways to show a link "less exposed" (label instead of a raw URL).
// Usage: npx tsx src/scripts/demo-cleanlink.ts <chat_id>   (or set DEMO_CHAT_ID)
const chatId = process.argv[2] || process.env.DEMO_CHAT_ID || '';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const u = `${config.BASE_URL}/q/8f2a4c`;

const steps: { name: string; run: () => Promise<unknown> }[] = [
  { name: '1) RAW url (exposed)', run: () => zalo.sendMessage(chatId, '1) Link thô (lộ nguyên URL):\n' + u) },
  { name: '2) markdown [label](url) → our page', run: () =>
      zalo.sendMessage(chatId, '2) Markdown label:\n[⚔️ Mở nhiệm vụ hôm nay](' + u + ')', { parseMode: 'markdown' }) },
  { name: '3) markdown [label](url) → clean site', run: () =>
      zalo.sendMessage(chatId, '3) Markdown label:\n[🟢 GreenNode AgentBase](https://greennode.ai)', { parseMode: 'markdown' }) },
  { name: '4) HTML <a>', run: () =>
      zalo.sendMessage(chatId, '4) HTML link: Nhấn <a href="https://greennode.ai">vào đây</a> để mở.', { parseMode: 'html' }) },
];

(async () => {
  for (const s of steps) {
    try { await s.run(); console.log('✅', s.name); }
    catch (e) { console.log('❌', s.name, '—', e instanceof Error ? e.message : String(e)); }
    await wait(900);
  }
  console.log('\nDone — in Zalo, see which shows a CLEAN tappable label vs literal "[...](...)".');
})();
