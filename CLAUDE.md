# CLAUDE.md — working guide for this repo

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
src/domain/links.ts   signLink({m,c}, ttl?) / verifyLink — JWT temp links
src/domain/mastery.ts BKT (defaultBkt, bktUpdate, isMastered)
src/skills/*          the AI + code skills (see below)
src/api/routes.ts     every HTTP handler
src/pages/ui.ts       shared design system (renderPage, topbar, logo, UI_CSS)
src/pages/*           server-rendered HTML (landing, newclass, manage, board, quest, admin)
src/scripts/*         dev/demo utilities
```

### Skills (`src/skills/`)
AI (each: own prompt, model via `MODELS.*`, JSON/text out, code fallback):
- `ingest.ts` — `extractConcepts` (Qwen), `planCurriculum` (MiniMax), `generateQuestions` (Qwen),
  `buildCoursePack(text, {instructions})` orchestrates. `instructions` = the coach's "yêu cầu thêm".
- `assess.ts` — `gradeObjective` (code, MCQ) · `gradeFreetext` (Qwen, rubric)
- `analytics.ts` — `aggregateClass` (code) · `cohortInsights` (Qwen) · `askClass` (Qwen)
- `schedule.ts` — `growthHook` (Gemma) re-engagement reminder · `congratsLine` (Gemma) completion congrats — both honest, not baity; redo congrats celebrates the real mastery gain vs last run
Code-only: `plan.ts` (`selectQuestionsForMember` adaptive: skip mastered, difficulty-match, cap;
`weakestConcept`) · `guard.ts` (`safetyScope` PII scrub + length clamp) · `extract.ts` (PDF/DOCX→text).

### Data model (Postgres)
`classes` (visibility, link_code, invite_code, coach_chat_id, active_quest_id) · `members`
(id=`chatId:classId`, status active|waitlist, mastery jsonb BKT, engagement jsonb) ·
`materials` (uploaded docs → text only) · `course_packs` (= Quests; material_ids + lifecycle:
`active`, `redoable`, `max_attempts` 0=∞, `opens_at`, `closes_at`) · `quest_runs` (member×quest
completed-run counter + `last_mastery` snapshot → redo/attempt gating & redo-improvement congrats) · `events` (every answer) · `coaches` (chat_id → latest display name).

### Routes
Pages: `/` landing · `/new` create class · `/manage/:token` · `/board/:token` · `/q/:token` quest · `/admin?t=`.
APIs: `/api/{class,material,material/upload,quest,quest/activate,quest/toggle,quest/resend,quest/remind,quest/config,answer,quest/complete,ask,approve,visibility,admin/delete-class}`.
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
list owned classes (one message each) · `học` → all currently-open quests (links) · `admin` (owner only) → signed admin link.
Joining/approval sends links to **all** active quests (new members get caught up on past quests too).

## Gotchas (these bit us — don't relearn the hard way)
- **GreenNode MaaS base URL:** `https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1` (OpenAI-compatible, Bearer). HF-style lowercase model ids.
- **Qwen3.5 & MiniMax are reasoning models** → pass `noThink:true` (adds `chat_template_kwargs:{enable_thinking:false}`) to get direct content, else `content` comes back empty/after long thinking. Qwen tutor calls all use noThink. MiniMax (reasoner) needs enough max_tokens.
- **Zalo webhook payload is FLAT**: `{event_name, message:{from,chat,text}}` — NOT the `{ok,result:{…}}` the docs render. `chat.id == from.id` in PRIVATE chats. Identity = `from.id` (display_name is NOT stable/safe).
- **Zalo sends text only** (no buttons/cards). Markdown shortcodes: `{orange}{/orange}` (≈ brand), `{green}` `{yellow}` `{red}` `{big}` `{underline}` with `parse_mode:'markdown'`. Links go in the text → "notify-and-link": styled message + signed `/q/:token` link opened in Zalo's in-app browser.
- **AgentBase deploy** = Docker image + public gateway; the container MUST listen `:8080` and expose `/health`. The `Dockerfile` uses 8080; local dev uses `PORT` (3030). Set env vars in the AgentBase runtime.
- **DB:** Railway Postgres, `ssl:{rejectUnauthorized:false}`. `migrate.ts` is idempotent (has `alter … add column if not exists`); run it after schema edits.
- **Concept ids are namespaced per quest** (`namespacePack` in routes) so per-member mastery never collides across a class's multiple quests.
- **Security:** all temp links are signed JWTs; the admin link is owner-bound (`OWNER_CHAT_ID`) + short TTL, only issued via the bot. `JWT_SECRET` MUST be a strong random in `.env` (the code default is insecure and forgeable).

## .env (gitignored) — keys that matter
`ZALO_BOT_TOKEN`, `ZALO_WEBHOOK_SECRET`, `BASE_URL`, `PORT` (3030),
`GREENNODE_API_KEY`, `GREENNODE_BASE_URL`, `MODEL_GATE|TUTOR|REASONER|EMBED`,
`DATABASE_URL`, `JWT_SECRET` (strong!), `OWNER_CHAT_ID`, `ADMIN_TTL_SECONDS`, `QUEST_LINK_TTL_SECONDS` (30d), `ZALO_BOT_URL`.

## Conventions & taste (the user cares about these)
- **No decorative clutter** — no chips/pills/sub-labels that merely restate; content-first.
- **Tone:** never blame the audience ("không ai học" ✗ → "khó đến với từng người" ✓); the growth
  agent must be honest encouragement, never baiting ("mồi" ✗).
- **Not a VNG Games product** — it's a team project; no business-unit attribution.
- **Act on clear directives;** pick a sensible default and state it instead of stalling on questions.
- **Cast naming (game-themed, Việt, approachable):** Người dẫn đường (teacher) · Anh hùng (learner) ·
  Đội (class) · Nhiệm vụ (quest) · Thử thách (question) · Bảng theo dõi (dashboard). The pitch uses
  these; some bot/app strings still say "Coach" — align if asked.
- **Design system:** QUEST✦ wordmark (ink "QUEST" + orange ✦), Space Grotesk (display) + Inter (body),
  light theme, VNG orange `#f1592b` + green→blue gradient `#10b981→#0068ff`. Shared in `src/pages/ui.ts`;
  the learner quest page (`quest.ts`) is bespoke but matched. Pitch / promo / poster decks live in `materials/` (gitignored, local only).

## Planning docs
Internal planning notes live in `notes/` (gitignored, local only): `project-concept.md` (pitch) ·
`architecture.md` (design) · `implementation-plan.md` (build) · `competition-req.md` (rules).
API reference (kept, committed): `zalo-bot-docs/`.
