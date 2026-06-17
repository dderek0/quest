# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Quest** — an AI study-companion that lives inside **Zalo**. A teacher uploads documents → AI turns
them into a Course Pack (concepts + questions) → learners do adaptive, graded 5-minute quests via the
Zalo bot (a notify-and-link flow) → a dashboard tracks the class and answers natural-language questions.
Gamified (XP / level / streak), Vietnamese-first.

This is a hackathon build (GreenNode Claw-a-thon). Solo, demo-first. Keep it shippable.

## Core principle
**Deterministic code orchestrates; the LLM only does language/judgment.** Command parsing, MCQ grading,
BKT mastery, adaptive question selection, PII scrub, analytics math — all plain code. The model is
called for discrete, single-shot "skills" (prompt → structured output), each with a non-AI fallback.

## Run / dev
```bash
npm install
# .env must exist (gitignored). Key vars below.
npx tsx src/db/migrate.ts            # apply schema (idempotent; safe to re-run)
npx tsx src/index.ts                 # start server on PORT (3030 in dev)
npm run typecheck                    # tsc --noEmit — run after edits
```
- **Restart cleanly by PORT, not name:** `lsof -ti tcp:3030 | xargs kill -9; pkill -f "src/index.ts"`.
  `pkill -f "tsx src/index.ts"` can miss the real port-holder (tsx spawns a child node process).
- Public HTTPS for the Zalo webhook in dev: an ngrok reserved domain → `BASE_URL`. Then
  `npm run webhook:set` registers it.
- Pages send `Cache-Control: no-store`; if a browser tab "shows no change," it's a stale tab — hard-reload.

## Architecture / where things live
```
src/index.ts          Express boot + all route mounts + /health + no-store middleware
src/config.ts         zod-validated env (typed `config`)
src/llm/client.ts     GreenNode OpenAI-compatible: call() / callJSON() / embed(); noThink + 429 retry
src/llm/models.ts     MODELS = { gate, tutor, reasoner } from env
src/zalo/client.ts    Bot API wrapper (sendMessage applies guard.safetyScope)
src/zalo/webhook.ts   inbound command router (deterministic regex/DB lookups, NOT AI)
src/db/{schema,client,store,migrate}.ts   Postgres (raw pg)
src/domain/types.ts   Concept / Question / CoursePack
src/domain/id.ts      newId(prefix)
src/domain/links.ts   signLink({m,c}, ttl?) / verifyLink · signQuestLink (30d) — JWT temp links
src/domain/mastery.ts BKT (defaultBkt, bktUpdate, isMastered)
src/domain/notify.ts  chunkQuestMessages — split multi-quest messages under Zalo's 2000-char cap
src/domain/leaderboard.ts  rank a class by mastery % (code); opt-in name visibility — opted-out peers anonymized "Anh hùng N", viewer always sees own row
src/skills/*          the AI + code skills (see below)
src/api/routes.ts     every HTTP handler
src/pages/ui.ts       shared design system (renderPage, topbar, logo, UI_CSS)
src/pages/*           server-rendered HTML (landing, newclass, manage, board, quest, admin)
src/scripts/*         dev/demo utilities
pitch/                standalone landing/voting page (index.html + zero-dep server.js); also served by the app at /pitch
brand/                committed brand kit (tokens, logos, guidelines) — source of truth for design
```

### Skills (`src/skills/`)
AI (each: own prompt, model via `MODELS.*`, JSON/text out, code fallback):
- `ingest.ts` — `extractConcepts` (Qwen), `planCurriculum` (MiniMax), `generateQuestions` (Qwen),
  `buildCoursePack(text, {instructions})` orchestrates. `instructions` = the coach's "yêu cầu thêm".
- `assess.ts` — `gradeObjective` (code, MCQ) · `gradeFreetext` (Qwen, rubric)
- `analytics.ts` — `aggregateClass` (code) · `cohortInsights` (Qwen) · `askClass` (Qwen)
- `schedule.ts` — `growthHook` (Gemma) re-engagement reminder · `congratsLine` (Gemma) completion congrats — both honest, not baity; redo congrats celebrates the real mastery gain vs last run
Code-only: `plan.ts` (`selectQuestionsForMember` adaptive: skip mastered, difficulty-match, cap, **shuffle
each MCQ's options** seeded per member+attempt so the correct answer isn't always slot A — the generator
emits correct-first; grading is by text so reordering is safe; `weakestConcept`) · `guard.ts` (`safetyScope`:
**balance markdown shortcodes** + PII scrub + 1990-char clamp — runs on every outbound msg) · `extract.ts` (PDF/DOCX→text).

### Data model (Postgres)
`classes` (visibility, link_code, invite_code, coach_chat_id, active_quest_id) · `members`
(id=`chatId:classId`, status active|waitlist, mastery jsonb BKT, engagement jsonb = xp/level/streak + `lb` leaderboard-name opt-in) ·
`materials` (uploaded docs → text only) · `course_packs` (= Quests; material_ids + lifecycle:
`active`, `redoable`, `max_attempts` 0=∞, `opens_at`, `closes_at`) · `quest_runs` (member×quest
completed-run counter + `last_mastery` snapshot → redo/attempt gating & redo-improvement congrats) · `events` (every answer) · `coaches` (chat_id → latest display name).

### Routes
Pages: `/` landing · `/new` create class · `/manage/:token` · `/board/:token` · `/q/:token` quest · `/admin?t=` · `/pitch` marketing/voting page.
`/` serves the pitch page instead of the landing when the request `Host` matches `PITCH_HOST` (default `quest.gssea.space`) — so a marketing domain points straight at it.
APIs: `/api/{class,material,material/upload,quest,quest/activate,quest/toggle,quest/resend,quest/remind,quest/config,answer,quest/complete,ask,approve,visibility,leaderboard/optin,admin/delete-class,admin/nudge}`.
`leaderboard/optin`=learner toggles own name visibility (token-bound) · `admin/nudge`=owner-only demo trigger that fires the personalized re-engagement reminder for a class NOW (`growthNudgeClass`, shared with cron `scripts/nudge.ts`).
`/zalo/webhook` (X-Bot-Api-Secret-Token), `/health`.
**Quest lifecycle:** creating a quest **broadcasts** its link to all active members; `activate`=assign+notify ·
`toggle`=on/off (silent) · `resend`=re-broadcast to all · `remind`=nudge ONLY those who haven't completed it (`quest_runs`) · `config`=redo/max_attempts/opens_at/closes_at ·
`complete`=record a run + advance daily streak + send a congrats/motivation message to the learner's Zalo (on a redo it highlights mastery gain vs last run; rejected unless they've actually answered ≥1 question — anti-fake).
`/q/:token` is gated server-side (active flag · time window · attempts) → friendly notice screens (`renderNotice`);
all-mastered ⇒ counts as completed (idempotent). Quest links use `QUEST_LINK_TTL_SECONDS` (30d), not the 24h default.
Long multi-quest messages (join/`học`/approve) are split via `domain/notify.chunkQuestMessages` so signed links never
truncate at the 2000-char limit. **Scheduled-open:** set `opens_at` in the future → `open_announced=false` → cron
`scripts/open-due.ts` sends a "now open" ping once when the time arrives.

### Bot commands (webhook.ts)
invite code → join (public=active, private=waitlist+ping coach) · coach link code → bind + Board link ·
`tạo lớp` → /new link carrying coach identity (auto-bind, no code) · `xem lớp`/`lớp của tôi`/`quản lý` →
list owned classes (one message each) · `học` → all currently-open quests (links) · `bxh`/`xếp hạng`/`top` →
the learner's class leaderboard (peers anonymized unless opted in) · `hiện tên`/`ẩn tên` → toggle leaderboard
name visibility · `admin` (owner only) → signed admin link.
Joining/approval sends links to **all** active quests (new members get caught up on past quests too).

## Gotchas (these bit us — don't relearn the hard way)
- **GreenNode MaaS base URL:** `https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1` (OpenAI-compatible, Bearer). HF-style lowercase model ids.
- **Qwen3.5 & MiniMax are reasoning models** → pass `noThink:true` (adds `chat_template_kwargs:{enable_thinking:false}`) to get direct content, else `content` comes back empty/after long thinking. Qwen tutor calls all use noThink. MiniMax (reasoner) needs enough max_tokens.
- **Zalo webhook payload is FLAT**: `{event_name, message:{from,chat,text}}` — NOT the `{ok,result:{…}}` the docs render. `chat.id == from.id` in PRIVATE chats. Identity = `from.id` (display_name is NOT stable/safe).
- **Zalo sends text only** (no buttons/cards). Markdown shortcodes: `{orange}{/orange}` (≈ brand), `{green}` `{yellow}` `{red}` `{big}` `{underline}` with `parse_mode:'markdown'`. Links go in the text → "notify-and-link": styled message + signed `/q/:token` link opened in Zalo's in-app browser.
  - **Shortcodes only render when balanced** — an unmatched tag makes Zalo dump the whole run as literal text. LLM messages (congrats/nudge/growth) often emit broken pairs (e.g. `{orange}…{/big}`), so `guard.safetyScope` balances them (drops unmatched openers/closers) on every send.
- **AgentBase deploy** = Docker image + public gateway; the container MUST listen `:8080` and expose `/health`. The `Dockerfile` uses 8080; local dev uses `PORT` (3030). Set env vars in the AgentBase runtime — incl. `DATABASE_URL`, **`DB_SSL=off`** (GreenNode). After repointing the DB you must **rebuild+push** the image (the old image hard-coded SSL-on and will fail against GreenNode) AND set the env vars AND **Redeploy**.
- **DB:** **GreenNode vDB** Postgres 15 (public endpoint, migrated off Railway). **SSL is OFF** — GreenNode *rejects* SSL (`DB_SSL=off`, the default), whereas Railway *required* it (`DB_SSL=require`); `src/db/client.ts` switches on `DB_SSL`. Connecting to GreenNode with SSL on → "server does not support SSL connections". `migrate.ts` is idempotent (`alter … add column if not exists`); run after schema edits. **DB host→host data copy:** `OLD_DATABASE_URL=… NEW_DATABASE_URL=… npx tsx src/scripts/migrate-data.ts` (pg-only, no pg_dump; per-side SSL via `OLD_DB_SSL`/`NEW_DB_SSL`; idempotent). The GreenNode `quest` DB also has PostGIS preinstalled (`geometry_columns` etc.) — ignore, not ours.
- **Concept ids are namespaced per quest** (`namespacePack` in routes) so per-member mastery never collides across a class's multiple quests.
- **Security:** all temp links are signed JWTs; the admin link is owner-bound (`OWNER_CHAT_ID`) + short TTL, only issued via the bot. `JWT_SECRET` MUST be a strong random in `.env` (the code default is insecure and forgeable).

## Deploy
- **App → GreenNode AgentBase** (Docker). Registry: `vcr.vngcloud.vn/111480-abp111765/quest:latest`.
  Build for **amd64** (`docker buildx build --platform linux/amd64 … --push`) — a Mac arm64 image won't run.
  AgentBase **does not auto-pull**: after pushing you must **Redeploy** the runtime (and if it's pinned to a
  digest, not `:latest`, update the digest). Verify pushes read-only: `docker buildx imagetools inspect <ref>`.
- **Landing → Railway** (or the app's `/pitch`). The `pitch/` folder is a self-contained static site +
  zero-dep `server.js` that binds `$PORT`; Railway root dir = `pitch`, `npm start`. Mirrored to its own repo.
- **Git remotes:** app → `github.com/dderek0/quest` (public) · landing → `github.com/gssea-ai/quest-landingpage` (private).
  Migration runs against the shared Railway Postgres, so DB changes apply to the deployed app once the image is live.

## .env (gitignored) — keys that matter
`ZALO_BOT_TOKEN`, `ZALO_WEBHOOK_SECRET`, `BASE_URL`, `PORT` (3030),
`GREENNODE_API_KEY`, `GREENNODE_BASE_URL`, `MODEL_GATE|TUTOR|REASONER|EMBED`,
`DATABASE_URL` (GreenNode vDB), `DB_SSL` (`off` for GreenNode / `require` for Railway), `DB_POOL_MAX` (pool size, default 20), `OLD_DATABASE_URL` (kept as rollback/migration source),
`JWT_SECRET` (strong!), `OWNER_CHAT_ID`, `ADMIN_TTL_SECONDS`, `QUEST_LINK_TTL_SECONDS` (30d), `ZALO_BOT_URL`, `PITCH_HOST` (optional — domain whose root serves `/pitch`).

## Conventions & taste (the user cares about these)
- **No decorative clutter** — no chips/pills/sub-labels that merely restate; content-first.
- **Tone:** never blame the audience ("không ai học" ✗ → "khó đến với từng người" ✓); the growth
  agent must be honest encouragement, never baiting ("mồi" ✗).
- **Not a VNG Games product** — it's a team project; no business-unit attribution.
- **Act on clear directives;** pick a sensible default and state it instead of stalling on questions.
- **Cast naming (game-themed, Việt, approachable):** Người dẫn đường (teacher) · Anh hùng (learner) ·
  Đội (class) · Nhiệm vụ (quest) · Thử thách (question) · Bảng theo dõi (dashboard). User-facing strings
  (pitch, bot messages, pages) use these; only the `coach` role value, `coach_chat_id` column, and
  `*ByCoach`/`bindCoach` identifiers stay as code (don't rename — they're data/contract, not UI).
- **Design system:** QUEST✦ wordmark (ink "QUEST" + orange ✦), Space Grotesk (display) + Inter (body),
  light theme, VNG orange `#f1592b` + green→blue gradient `#10b981→#0068ff`. Shared in `src/pages/ui.ts`;
  the learner quest page (`quest.ts`) is bespoke but matched. Pitch / promo / poster decks live in `materials/` (gitignored, local only).

## Planning docs
Internal planning notes live in `notes/` (gitignored, local only): `project-concept.md` (pitch) ·
`architecture.md` (design) · `implementation-plan.md` (build) · `competition-req.md` (rules).
API reference (kept, committed): `zalo-bot-docs/`.
