// Minimal, jsonb-heavy schema (implementation-plan.md §3). Embedded as a string so it
// bundles into the Docker image without copying .sql files.
export const SCHEMA_SQL = `
create table if not exists classes (
  id            text primary key,
  name          text not null,
  coach_chat_id text,
  visibility    text not null default 'private',   -- public | private
  link_code     text unique,                       -- Coach binds via this
  invite_code   text unique,                       -- Members join via this
  course_id        text,                           -- (legacy) single-pack classes
  active_quest_id  text,                           -- the Quest currently served to members
  config        jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists course_packs (
  id           text primary key,
  class_id     text,
  title        text not null,
  summary      text,
  language     text not null default 'vi',
  source_chars int,
  concepts     jsonb not null default '[]',
  questions    jsonb not null default '[]',
  material_ids jsonb not null default '[]',        -- Materials this Quest was built from
  active       boolean not null default true,      -- assigned/visible to learners
  redoable     boolean not null default true,      -- can a learner replay after completing
  max_attempts int not null default 0,             -- 0 = unlimited; else cap on completed runs
  opens_at     timestamptz,                        -- null = open now
  closes_at    timestamptz,                        -- null = no deadline
  open_announced boolean not null default true,    -- did the "now open" ping go out? false ⇒ scheduler will send it
  created_at   timestamptz not null default now()
);

-- One row per (member, quest): how many completed runs, for redo/retry gating.
create table if not exists quest_runs (
  member_id  text not null,
  quest_id   text not null,
  attempts   int  not null default 0,
  completed  boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (member_id, quest_id)
);

-- Latest display name per Zalo chat id (refreshed on every inbound message) → class owner name.
create table if not exists coaches (
  chat_id    text primary key,
  name       text,
  updated_at timestamptz not null default now()
);

-- Uploaded source documents living in a Class library; Quests are built from a chosen subset.
create table if not exists materials (
  id           text primary key,
  class_id     text not null,
  title        text not null,
  content      text not null,
  source_chars int,
  created_at   timestamptz not null default now()
);

create table if not exists members (
  id          text primary key,                    -- hashed chat_id
  class_id    text not null,
  chat_id     text,
  name        text,
  role        text,
  lang        text default 'vi',
  status      text not null default 'active',       -- waitlist | active
  profile     jsonb not null default '{}',          -- onboard.intake: role/goal/level
  mastery     jsonb not null default '{}',          -- { conceptId: {pL,pT,pS,pG} }  (BKT)
  engagement  jsonb not null default '{}',          -- { streak, xp, level, last_seen }
  created_at  timestamptz not null default now()
);

create table if not exists events (
  id          bigserial primary key,
  member_id   text,
  class_id    text,
  skill       text,
  concept_id  text,
  question_id text,
  score       real,
  model       text,
  meta        jsonb,
  ts          timestamptz not null default now()
);
create index if not exists events_member_idx on events (member_id);
create index if not exists members_class_idx on members (class_id);
create index if not exists materials_class_idx on materials (class_id);

-- idempotent column adds for existing databases
alter table classes add column if not exists active_quest_id text;
alter table course_packs add column if not exists material_ids jsonb not null default '[]';
alter table course_packs add column if not exists active boolean not null default true;
alter table course_packs add column if not exists redoable boolean not null default true;
alter table course_packs add column if not exists max_attempts int not null default 0;
alter table course_packs add column if not exists opens_at timestamptz;
alter table course_packs add column if not exists closes_at timestamptz;
alter table course_packs add column if not exists open_announced boolean not null default true;
alter table quest_runs add column if not exists last_mastery real not null default 0;
`;
