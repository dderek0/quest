import { zalo } from '../zalo/client';
import { config } from '../config';

// Send a quest-page link to a chat — both a styled nudge and a bare URL (to test card preview).
// Usage: npx tsx src/scripts/send-link.ts <chat_id>   (or set DEMO_CHAT_ID)
const chatId = process.argv[2] || process.env.DEMO_CHAT_ID || '';
const base = process.env.QUEST_BASE || config.BASE_URL;
const url = `${base}/q/8f2a4c`;

(async () => {
  await zalo.sendMessage(
    chatId,
    `{orange}**⚔️ Nhiệm vụ hôm nay đã sẵn sàng!**{/orange}\n⏱️ 5 phút · 🧩 5 câu · ⭐ +120 XP\n👉 ${url}`,
    { parseMode: 'markdown' },
  );
  await new Promise((r) => setTimeout(r, 800));
  await zalo.sendMessage(chatId, url); // bare URL — does Zalo auto-preview a card?
  console.log('sent →', url);
})();
