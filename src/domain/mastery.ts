// Bayesian Knowledge Tracing (architecture.md §6.1). Pure math, no LLM.
export type Bkt = { pL: number; pT: number; pS: number; pG: number };

// pL prior-known · pT transit(learn) · pS slip · pG guess
export const defaultBkt = (): Bkt => ({ pL: 0.2, pT: 0.15, pS: 0.1, pG: 0.2 });

export function bktUpdate(b: Bkt, correct: boolean): Bkt {
  const { pL, pT, pS, pG } = b;
  const num = correct ? pL * (1 - pS) : pL * pS;
  const den = correct ? pL * (1 - pS) + (1 - pL) * pG : pL * pS + (1 - pL) * (1 - pG);
  const post = den > 0 ? num / den : pL; // P(L | observation)
  const pLnext = post + (1 - post) * pT; // learning between attempts
  return { ...b, pL: Math.min(0.999, Math.max(0.001, pLnext)) };
}

export const isMastered = (b: Bkt) => b.pL >= 0.95;
