# Zalo Bot Platform — API Reference (mirrored)

> Source: https://bot.zapps.me/docs · mirrored 2026-06-14 for offline use during Claw-a-thon.
> A Telegram-style Bot API. Some pages render code samples server-side that didn't capture
> in the mirror — verify exact request snippets on the live page when wiring them up.
> Operator: Công Ty TNHH Zalo Platforms (HCMC, Vietnam). Data stored on servers in Vietnam.

## 0. TL;DR cheat sheet
- **Base URL:** `https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<methodName>`
- **Auth:** `<BOT_TOKEN>` in the path (format `12345689:abc-xyz`). No expiry until you reset it.
- **Methods:** GET or POST. UTF-8. **Method names are case-sensitive.**
- **Params:** query string · `x-www-form-urlencoded` · `application/json` · `multipart/form-data` (uploads).
- **Response envelope:** `{ "ok": bool, "result": ..., "description": str?, "error_code": int? }`
- **Receive messages:** Webhook (prod) **or** `getUpdates` long-poll (dev) — mutually exclusive.
- **Send:** `sendMessage` (text, 1–2000 chars, markdown/html/styles — **no buttons**), `sendPhoto`,
  `sendSticker`, `sendVoice` (.aac URL), `sendChatAction` (typing).

---

## 1. Setup

### 1.1 Create a bot  (`/docs/create-bot/`)
1. In the Zalo app, search the OA **"Zalo Bot Manager"** → chat menu → **"Create bot"** → opens the
   **"Zalo Bot Creator"** mini-app.
2. Enter a **bot name that must start with `Bot`** (e.g. `Bot MyShop`), submit → **Create Bot**.
3. The system DMs you the **Bot Token** on your Zalo account.
4. Program it in Node.js, Python, or a no-code tool. Receive messages via **long polling** (`getUpdates`)
   or **webhook** (`setWebhook`).

### 1.2 Authorization  (`/docs/authorize/`)
- Bot Token model. Token form: `12345689:abc-xyz`. Valid indefinitely until manually reset.
- Call format: `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}/functionName`
- Reset the token in Zalo Bot Creator → settings; new token delivered via Zalo message.

### 1.3 Calling the API  (`/docs/call-api/`)
- URL: `https://bot-api.zaloplatforms.com/bot<BOT_TOKEN>/<functionName>` (HTTPS only).
  Example: `.../bot123456789:abc123xyz/getMe`
- HTTP GET for reads, POST for writes/updates.
- Param passing: query string · `application/x-www-form-urlencoded` · `application/json` · `multipart/form-data`.
- Response object fields: `ok` (bool), `result` (data), `description` (error text), `error_code` (int).
- All requests UTF-8; method names case-sensitive.

---

## 2. Receiving messages

### 2.1 Webhook  (`/docs/webhook/`)
Zalo sends **HTTP POST** to your configured webhook URL on user interaction.
- **Content-Type:** application/json
- **Auth header:** `X-Bot-Api-Secret-Token` — must match your configured secret; verify before processing.
- Use an HTTPS domain.

Payload — **real observed shape is FLAT** (no `result` wrapper); parse top-level `event_name` / `message`:
```json
{ "event_name": "message.text.received",
  "message": {
    "from": { "id": "…", "is_bot": false, "display_name": "Duy" },
    "chat": { "id": "…", "chat_type": "PRIVATE" },
    "text": "Hi", "message_id": "…", "date": 1700000000000 } }
```
> ⚠️ The docs *render* a `{ "ok": true, "result": { event_name, message } }` wrapper, but the
> actual POST body is flat (verified live 2026-06-14). Reply target = `message.chat.id`
> (== `message.from.id` in a PRIVATE chat).

**Event types (`event_name`):**
- `message.text.received` — text message
- `message.image.received` — image
- `message.sticker.received` — sticker
- `message.voice.received` — voice
- `message.unsupported.received` — unsupported / **withheld content (see note)**

**`message` object:**
| Field | Type | Req | Description |
|---|---|---|---|
| `from` | object | yes | sender info |
| `chat` | object | yes | conversation; `chat_type` = `PRIVATE` or `GROUP` |
| `text` | string | no | text content |
| `photo` | string | no | **image URL** |
| `caption` | string | no | text accompanying an image |
| `sticker` | string | no | sticker id (Zalo source) |
| `url` | string | no | sticker URL |
| `voice_url` | string | no | **audio file URL** |
| `message_id` | string | no | unique id |
| `date` | number | no | timestamp (ms) |

> ⚠️ **Protected-account note:** accounts in protected categories (e.g. minors) deliver
> `message.unsupported.received` **instead of the actual content**, "để đảm bảo việc xử lý dữ liệu
> tuân thủ quy định pháp luật" — i.e. the bot does **not** receive their real message text/media.

### 2.2 getUpdates  (`/docs/apis/getUpdates/`) — dev/long-poll
- `POST .../getUpdates` · returns the same message JSON as the webhook.
- **Does not work if a webhook is set** → call `deleteWebhook` first. Intended for local dev.

| Field | Type | Req | Description |
|---|---|---|---|
| `timeout` | string | no | HTTP timeout in seconds (default 30) |

### 2.3 setWebhook  (`/docs/apis/setWebhook/`)
`POST .../setWebhook`
| Field | Type | Req | Description |
|---|---|---|---|
| `url` | string | yes | HTTPS webhook URL |
| `secret_token` | string | yes | 8–256 chars; returned in `X-Bot-Api-Secret-Token` header on every call |

Response: `{ "ok": true, "result": { "url": "...", "updated_at": 1749538250568 } }`

### 2.4 deleteWebhook  (`/docs/apis/deleteWebhook/`)
`POST .../deleteWebhook` (no params) → removes webhook (switch back to getUpdates). Returns updated (empty) url + timestamp.

### 2.5 getWebhookInfo  (`/docs/apis/getWebhookInfo/`)
`POST .../getWebhookInfo` (no params) → `{ ok, result: { url, updated_at } }`.

---

## 3. Sending messages

### 3.1 sendMessage  (`/docs/apis/sendMessage/`)  ★ core
`POST .../sendMessage`
| Field | Type | Req | Description |
|---|---|---|---|
| `chat_id` | string | yes | recipient / conversation id |
| `text` | string | yes | **1–2000 chars** |
| `parse_mode` | string | no | `markdown` or `html` |
| `text_styles` | array | no | style runs over raw text |

Request:
```json
{ "chat_id": "abc.xyz", "text": "Xin chào bạn",
  "text_styles": [ { "start": 0, "len": 7, "st": ["b", "c_db342e"] } ] }
```
Response:
```json
{ "ok": true, "result": { "message_id": "82599fa32f56d00e8941", "date": 1749632637199 } }
```

**Formatting:**
- `parse_mode: markdown` → `**bold**` · `*italic*` · `***bold italic***` · `~~strike~~` · `` `code` `` ·
  `# heading` · `- list` · `1. ordered` · `> quote`, **plus color/size shortcodes**:
  `{red}…{/red}` `{orange}` `{yellow}` `{green}` `{big}` `{underline}`. (Easiest way to style a nudge — `{orange}` ≈ VNG brand.)
- `parse_mode: html` → `<b> <i> <u> <s> <h1..h6> <ul> <ol> <li> <p> <div>` with `style`. Unknown tags stripped (inner text kept).
- `text_styles[]`: `{ start (UTF-16), len (UTF-16), st: [codes] }`. Codes:
  `b` bold · `i` italic · `u` underline · `s` strike · font `f_13|f_15|f_18|f_20` ·
  colors `c_050a19` `c_15a85f` `c_f7b503` `c_f27806` `c_db342e` · lists `lst_1|lst_2` · indent `ind_1..ind_5`.
  (`c_f27806` is an orange — close to VNG's brand color.)
- `parse_mode` **takes priority** over `text_styles` if both sent; they use different offset systems — don't combine.
- **No inline buttons / keyboards / link-cards** documented — links go in the text (markdown link or raw URL).

### 3.2 sendPhoto  (`/docs/apis/sendPhoto/`)
`POST .../sendPhoto`
| Field | Type | Req | Description |
|---|---|---|---|
| `chat_id` | string | yes | recipient / conversation id |
| `photo` | string | yes | image path |
| `caption` | string | no | 1–2000 chars |
(Accepted formats/size & URL-vs-upload not specified in docs.)

### 3.3 sendSticker  (`/docs/apis/sendSticker/`)
`POST .../sendSticker` · `chat_id` + `sticker` (value from https://stickers.zaloapp.com/ — tutorial https://vimeo.com/649330161).

### 3.4 sendVoice  (`/docs/apis/sendVoice/`)
`POST .../sendVoice` · `chat_id` + `voice_url` → **`.aac` files only**; voice messages carry no caption.

### 3.5 sendChatAction  (`/docs/apis/sendChatAction/`)
`POST .../sendChatAction` · `chat_id` + `action`. Actions: `typing` (text); `upload_photo` (coming soon). Returns `{ "ok": true }`.

### 3.6 getMe  (`/docs/apis/getMe/`)
`POST .../getMe` (no params) → validates token, returns the bot:
```json
{ "ok": true, "result": { "id": "1234567890123456789", "account_name": "bot.example",
  "account_type": "BASIC", "can_join_groups": false } }
```

---

## 4. Error codes  (`/docs/error-code/`)
| Code | Meaning |
|---|---|
| 400 | Bad request — invalid path or API name |
| 401 | Unauthorized — token expired or invalid |
| 403 | Internal server error |
| 404 | Not found — invalid access request |
| 408 | Request timeout — processing time exceeded |
| 429 | **Quota exceeded — API usage limit exceeded** |
| 425 | *(observed, not in docs)* invalid sticker — `sendSticker` with a bad value → "The sticker is invalid" |
Always read the `description` field for detail. (Exact rate-limit numbers not published; more codes likely exist than the table lists.)

---

## 5. Terms — key points  (`/docs/terms/`)
- **Developer must be ≥18.** End-users **13–17 require guardian consent**; content harming minors prohibited.
- Developers must tell end-users they're talking to an automated system + give clear data-collection notice.
- Security measures applied; **data stored on servers in Vietnam**; developer responsible for compliant data handling.
- No explicit per-user message quota / proactive-messaging rule published (but error 429 implies a quota exists).

---

## 6. OpenClaw → Zalo bot  (`/docs/build-personal-assistant-with-open-claw/`)
Plugin **`@zalo-platforms/openclaw-zaloclawbot`** turns OpenClaw into "My ClawBot," a personal AI
assistant running directly on Zalo.
- **Prereqs:** OpenClaw installed + onboarded; an AI provider configured (OpenAI / Claude / Gemini / etc.).
- **Install:** `npx -y @zalo-platforms/openclaw-zaloclawbot-cli install`
- A **QR code** appears in the terminal → scan in Zalo → **"Create My ClawBot"** → authorizes the plugin to
  create the bot, integrate it with OpenClaw, and sync config.
- The bot then appears in your Zalo chat list, conversing via OpenClaw — no separate app.

---

## Source URLs
- Intro `/docs/` · Create bot `/docs/create-bot/` · Authorize `/docs/authorize/` · Call API `/docs/call-api/`
- `/docs/apis/{getMe,getUpdates,setWebhook,deleteWebhook,getWebhookInfo,sendMessage,sendPhoto,sendSticker,sendVoice,sendChatAction}/`
- Webhook `/docs/webhook/` · Best practices (OpenClaw) `/docs/build-personal-assistant-with-open-claw/`
- Error codes `/docs/error-code/` · Terms `/docs/terms/`
