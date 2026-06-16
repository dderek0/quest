import { config } from '../config';

// The 3-tier map (architecture.md §1) — route every call to the cheapest model
// whose strength clears the bar. ~70% gate / ~25% tutor / ~5% reasoner.
export const MODELS = {
  reasoner: config.MODEL_REASONER, // MiniMax — plan · diagnose · cohort insight · ask-your-class
  tutor: config.MODEL_TUTOR, //     Qwen — tutor · author · grade · Vietnamese · vision
  gate: config.MODEL_GATE, //       Gemma — route · guard · nudge · quick-grade
} as const;

export type Tier = keyof typeof MODELS;
