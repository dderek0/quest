import { zalo } from '../zalo/client';
import { config } from '../config';

// Fire one of every Zalo Bot send capability at a chat, so we can SEE them.
// Usage: npx tsx src/scripts/demo-send.ts <chat_id>   (or set DEMO_CHAT_ID)
const chatId = process.argv[2] || process.env.DEMO_CHAT_ID || '';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const steps: { name: string; run: () => Promise<unknown> }[] = [
  { name: 'plain text (header)', run: () =>
      zalo.sendMessage(chatId, '🧪 Quest demo — mọi kiểu tin nhắn Bot có thể gửi:') },
  { name: 'sendChatAction: typing', run: () => zalo.sendChatAction(chatId, 'typing') },
  { name: 'markdown', run: () => zalo.sendMessage(chatId,
      '1) Markdown\n**đậm** · *nghiêng* · ~~gạch ngang~~ · `code`\n# Tiêu đề\n- mục a\n- mục b\n> trích dẫn',
      { parseMode: 'markdown' }) },
  { name: 'markdown colors/size', run: () => zalo.sendMessage(chatId,
      '2) Màu & cỡ chữ\n{orange}Cam (≈ VNG){/orange} · {red}Đỏ{/red} · {green}Xanh lá{/green} · {yellow}Vàng{/yellow}\n{big}Chữ to{/big} · {underline}Gạch chân{/underline}',
      { parseMode: 'markdown' }) },
  { name: 'text_styles', run: () => zalo.sendMessage(chatId,
      '3) text_styles: QUEST',
      { textStyles: [{ start: 16, len: 5, st: ['b', 'c_f27806', 'f_20'] }] }) },
  { name: 'html', run: () => zalo.sendMessage(chatId,
      '4) HTML: <b>đậm</b> <i>nghiêng</i> <u>gạch chân</u> <s>gạch ngang</s>', { parseMode: 'html' }) },
  { name: 'tappable link', run: () => zalo.sendMessage(chatId,
      '5) Link có thể chạm (mở trong Zalo):\nhttps://bot.zapps.me/docs', { parseMode: 'markdown' }) },
  { name: 'sendPhoto', run: () => zalo.sendPhoto(chatId,
      'https://picsum.photos/seed/quest/800/500', '6) sendPhoto — ảnh kèm caption.') },
  { name: 'sendVoice (.aac)', run: () => zalo.sendVoice(chatId, `${config.BASE_URL}/assets/hello.aac`) },
  { name: 'sendSticker', run: () => zalo.sendSticker(chatId, process.env.DEMO_STICKER || '0') },
  { name: 'plain text (footer)', run: () => zalo.sendMessage(chatId,
      '✅ Hết. Bot gửi được: văn bản (markdown/html/màu), ảnh, voice (.aac), sticker, “đang soạn…”.\nKHÔNG có nút bấm → phần tương tác nằm ở trang web mở qua link.') },
];

(async () => {
  console.log(`Sending demo to chat_id=${chatId}\n`);
  for (const s of steps) {
    try {
      await s.run();
      console.log('✅', s.name);
    } catch (e) {
      console.log('❌', s.name, '—', e instanceof Error ? e.message : String(e));
    }
    await wait(700); // keep ordering readable in the chat
  }
  console.log('\nDone — check Zalo.');
})();
