import { zalo } from '../zalo/client';

// Test how the Bot API renders links — does a bare URL auto-preview into a card?
// Usage: npx tsx src/scripts/demo-link.ts <chat_id>   (or set DEMO_CHAT_ID)
const chatId = process.argv[2] || process.env.DEMO_CHAT_ID || '';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tests: { name: string; run: () => Promise<unknown> }[] = [
  { name: 'A) bare URL only (greennode)', run: () => zalo.sendMessage(chatId, 'https://greennode.ai') },
  { name: 'B) bare URL only (zalo.me)', run: () => zalo.sendMessage(chatId, 'https://zalo.me') },
  { name: 'C) markdown link [label](url)', run: () =>
      zalo.sendMessage(chatId, '[GreenNode AgentBase](https://greennode.ai)', { parseMode: 'markdown' }) },
  { name: 'D) text + URL on next line', run: () =>
      zalo.sendMessage(chatId, '🎯 Nhiệm vụ hôm nay đã sẵn sàng!\nhttps://greennode.ai') },
];

(async () => {
  console.log(`Link tests → ${chatId}\n`);
  for (const t of tests) {
    try { await t.run(); console.log('✅', t.name); }
    catch (e) { console.log('❌', t.name, '—', e instanceof Error ? e.message : String(e)); }
    await wait(1200);
  }
  console.log('\nDone — in Zalo, see which (if any) becomes a preview card.');
})();
