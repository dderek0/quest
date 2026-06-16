import { config } from '../config';
import { safetyScope } from '../skills/guard';

// Thin client over the Zalo Bot API (zalo-bot-docs/).
// Base: https://bot-api.zaloplatforms.com/bot<TOKEN>/<method>  · response: { ok, result, description, error_code }

const base = () => `${config.ZALO_API_BASE}/bot${config.ZALO_BOT_TOKEN}`;

async function callBot<T = any>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${base()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!data.ok) {
    throw new Error(`Zalo ${method} [${data.error_code ?? res.status}]: ${data.description ?? res.statusText}`);
  }
  return data.result as T;
}

export type TextStyle = { start: number; len: number; st: string[] };
export type SendOpts = { parseMode?: 'markdown' | 'html'; textStyles?: TextStyle[] };

export const zalo = {
  getMe: () => callBot('getMe'),
  // text 1–2000 chars; parse_mode 'markdown'|'html' (incl. {orange}…{/orange} shortcodes) OR
  // text_styles. No buttons/cards — links go IN the text.
  sendMessage: (chatId: string, text: string, opts: SendOpts = {}) =>
    callBot('sendMessage', {
      chat_id: chatId,
      text: safetyScope(text), // guard.safety_scope: scrub PII + clamp length on all outbound
      ...(opts.parseMode ? { parse_mode: opts.parseMode } : {}),
      ...(opts.textStyles ? { text_styles: opts.textStyles } : {}),
    }),
  sendPhoto: (chatId: string, photo: string, caption?: string) =>
    callBot('sendPhoto', { chat_id: chatId, photo, ...(caption ? { caption } : {}) }),
  sendSticker: (chatId: string, sticker: string) => callBot('sendSticker', { chat_id: chatId, sticker }),
  sendVoice: (chatId: string, voiceUrl: string) => callBot('sendVoice', { chat_id: chatId, voice_url: voiceUrl }),
  sendChatAction: (chatId: string, action: 'typing' | 'upload_photo' = 'typing') =>
    callBot('sendChatAction', { chat_id: chatId, action }),
  setWebhook: (url: string, secretToken: string) => callBot('setWebhook', { url, secret_token: secretToken }),
  getWebhookInfo: () => callBot('getWebhookInfo'),
  deleteWebhook: () => callBot('deleteWebhook'),
};
