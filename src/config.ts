import 'dotenv/config';
import { z } from 'zod';

// Validated, typed env. Echo-bot needs only the Zalo + app vars; models/DB are
// optional so the service boots before the GreenNode/AgentBase workshop.
const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  BASE_URL: z.string().url().default('http://localhost:3000'),
  TZ: z.string().default('Asia/Ho_Chi_Minh'),

  // Zalo Bot — required for the bot to work (see zalo-bot-docs/)
  ZALO_BOT_TOKEN: z.string().min(1, 'ZALO_BOT_TOKEN is required'),
  ZALO_API_BASE: z.string().url().default('https://bot-api.zaloplatforms.com'),
  ZALO_BOT_URL: z.string().default('http://zalo.me/your-bot?src=qr'), // public link to open the bot (set in .env)
  ZALO_WEBHOOK_SECRET: z.string().min(8, 'ZALO_WEBHOOK_SECRET must be >= 8 chars'),

  // GreenNode Serverless AI (models) — optional until you have a key
  GREENNODE_API_KEY: z.string().optional(),
  GREENNODE_BASE_URL: z.string().url().default('https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1'),
  MODEL_REASONER: z.string().default('minimax/minimax-m2.5'), // reasoning (thinking on)
  MODEL_TUTOR: z.string().default('qwen/qwen3-5-27b'), //        Qwen — call with noThink:true
  MODEL_GATE: z.string().default('google/gemma-4-31b-it'), //    instruct, fast
  MODEL_EMBED: z.string().default('baai/bge-m3'),

  // Temp links / auth
  JWT_SECRET: z.string().min(8).default('dev-insecure-change-me'),
  LINK_TTL_SECONDS: z.coerce.number().default(86400),
  QUEST_LINK_TTL_SECONDS: z.coerce.number().default(2592000), // 30d — quest links last; access is gated server-side (active/window/attempts)
  CRON_SECRET: z.string().default('dev-cron'),
  OWNER_CHAT_ID: z.string().default(''), // only this Zalo chat can summon an admin link
  ADMIN_TTL_SECONDS: z.coerce.number().default(3600), // admin link lifetime (1h)

  // Relational data — optional until Day 1
  DATABASE_URL: z.string().optional(),
  DB_SSL: z.enum(['require', 'off']).default('off'), // GreenNode vDB has SSL OFF; Railway needed 'require'
  DB_POOL_MAX: z.coerce.number().default(20),        // pool size per process (bumped for public testing)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === 'production';
