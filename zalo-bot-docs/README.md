# Zalo Bot Platform — docs mirror + review (for Quest)

Local mirror of **https://bot.zapps.me/docs** (fetched 2026-06-14) so we can reference it
offline all week. Full API in **[`api-reference.md`](./api-reference.md)**. This file is the
**review + what it means for Quest**.

---

## Verdict: this is great news, and simpler than we'd planned

It's a **Telegram-style Bot API** (a Bot Token + REST: `getMe`, `getUpdates`, `setWebhook`,
`sendMessage`, `sendVoice`…). That means **no Official-Account verification, no ZNS template
approval, no per-message billing path** to design around — the thing I'd flagged to "confirm at
the workshop" mostly evaporates. You create a bot inside the Zalo app, get a token, and POST to
`https://bot-api.zaloplatforms.com/bot<TOKEN>/<method>`.

It also **validates our whole pivot**: the API can only send **text** (richly formatted, but no
buttons / cards / inline keyboards). So "Zalo notifies, our pages do the work" isn't a
compromise — it's literally the only thing the API can do. We were already building the right thing.

---

## What maps cleanly onto Quest ✅

| Quest piece | Bot API support |
|---|---|
| **The nudge** (`schedule.compose_nudge`) | `sendMessage` — text 1–2000 chars, **markdown/html + color codes** (incl. `c_f27806`, an orange near VNG's). Style it nicely. |
| **The deep link** (`link.sign`) | put the temp URL in the message text (markdown link or raw URL); tap → opens **Zalo in-app browser** → our page. |
| **Inbound from learner** | webhook `POST` with `X-Bot-Api-Secret-Token`; events for text / image / voice / sticker. |
| **Photo-to-lesson** (vision) | `message.image.received` → `photo` is an **image URL** → feed to `ingest.read_source` / `vision.read_image`. Works. |
| **Voice in** | `message.voice.received` → `voice_url` (audio URL) → STT. Works. |
| **Voice reply** | `sendVoice` needs **`.aac` at a URL** → TTS must output/transcode to `.aac` and host it on our domain. |
| **"typing…" polish** | `sendChatAction: typing` while the model thinks. |
| **Onboarding QR** (promo) | creating/starting the bot is QR-based — matches the promo's "Quét để bắt đầu." |
| **A class/Team channel** | `chat_type` can be `GROUP` → a class group where the bot posts quest links is possible. |

---

## Gotchas to design around ⚠️ (read these before building)

1. **No buttons / cards.** `sendMessage` is text only. → The promo's pretty "link-card with a
   *Bắt đầu →* button" isn't literally how a Zalo message looks; reality is **styled text + a
   tappable link**. (Marketing mockup is fine as aspiration; just know the real surface.) All real
   interaction stays on the web page — exactly our model.

2. **Minors' content is withheld.** Protected accounts (e.g. minors) send
   `message.unsupported.received` **instead of their real text/photo/voice** — the bot never sees the
   content. Plus Terms: **dev ≥18; users 13–17 need guardian consent.**
   - **Why we're mostly fine:** in Quest, learners *answer on the web page*, not by chatting the bot.
     The bot only pushes nudges + links. So grading never depends on receiving a minor's message. Our
     notify-and-link design **sidesteps this** — a real point in our favor.
   - **But:** for "Quest for School" with young kids, plan the account model deliberately — the
     **Coach/teacher or a parent** holds the Zalo and the bot, or use older students / a class group.
     Don't promise "every 8-year-old chats the bot directly." Flag this in the humanitarian pitch as a
     thoughtful compliance choice, not a bug.

3. **Proactive messaging probably needs first opt-in.** The docs don't spell out whether a bot can
   message a user who never messaged it (Telegram can't). **Plan for opt-in:** the user starts the bot
   once (QR / first message) → webhook gives us their `chat_id` → we store it on the Hero → then we can
   push daily nudges. This is also cleaner for consent. *(Verify the exact proactive window/limit early.)*

4. **There's a quota (HTTP 429).** "Quota exceeded — API usage limit exceeded." Exact numbers aren't
   published. → **batch** nightly nudges, add **backoff/retry** on 429. We already planned batching;
   make the backoff real. *(Confirm the actual rate limit at the workshop.)*

5. **Webhook vs getUpdates are mutually exclusive.** Use **webhook in prod** (HTTPS + secret on our
   domain); `getUpdates` only for local dev, and only after `deleteWebhook`.

6. **`.aac`-only voice & token-in-URL.** Voice replies must be `.aac`. The Bot Token sits in the URL
   path — keep it server-side only (never in client/page code), rotate via Zalo Bot Creator if leaked.

---

## OpenClaw shortcut (ties to the competition's provided resource) 🎁

The platform ships a plugin — `npx -y @zalo-platforms/openclaw-zaloclawbot-cli install` → scan QR →
**"Create My ClawBot"** — that wires **OpenClaw** (which the Claw-a-thon gives us, and which can point at
the MaaS models) straight onto a Zalo bot.
- **Use it for:** a **day-1 smoke test** (a working Zalo bot in minutes) and as the **in-chat
  conversational tutor** fallback.
- **Don't use it for:** the core Quest loop — we need our own webhook + page service + scheduler +
  grading + per-concept state, which the plugin won't give us. So: **our own bot for the engine,
  OpenClaw as a fast prototype + chat-tutor option.** (Also a nice pitch line: "built on the Zalo Bot
  Platform, leveraging the provided OpenClaw.")

---

## Architecture deltas to fold into `architecture.md`
(Proposed — say the word and I'll apply.)
- Rename the delivery component **"Zalo OA" → "Zalo Bot"**; base `https://bot-api.zaloplatforms.com/bot<TOKEN>/…`, auth = Bot Token.
- **Drop** the "OA-window vs ZNS" caveat; **replace** with: opt-in first-contact, 429 quota → batch+backoff, minors → `unsupported` (mitigated by web-page answering).
- Inbound = webhook (`X-Bot-Api-Secret-Token`); message fields `photo`/`voice_url` power vision + STT.
- Outbound nudge = `sendMessage` (styled text + link); voice reply = `sendVoice` (.aac on our domain).
- Add OpenClaw as: optional fast-prototype bot + in-chat tutor fallback.

## Day-1 setup checklist
1. Zalo app → OA **"Zalo Bot Manager"** → **Create bot** (name starts with `Bot…`) → save the **Bot Token** (server-side secret).
2. `getMe` to confirm the token.
3. Stand up an HTTPS endpoint on **our domain** → `setWebhook(url, secret_token)` → verify `X-Bot-Api-Secret-Token` on every call.
4. Echo test: on `message.text.received`, `sendMessage` back. Then send a **styled text + temp link**.
5. (Optional) `npx @zalo-platforms/openclaw-zaloclawbot-cli install` for an instant OpenClaw-powered bot to compare.
