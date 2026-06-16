import jwt from 'jsonwebtoken';
import { config } from '../config';

// Short-lived signed links: identify the member + course, no login (architecture §9).
export type LinkPayload = { m: string; c: string }; // memberId, courseId

export const signLink = (p: LinkPayload, ttlSeconds: number = config.LINK_TTL_SECONDS): string =>
  jwt.sign(p, config.JWT_SECRET, { expiresIn: ttlSeconds });

// Quest links live much longer than coach/admin links — a learner may open one days later.
// Safe because the quest page now gates access server-side (active flag, time window, attempts).
export const signQuestLink = (p: LinkPayload): string => signLink(p, config.QUEST_LINK_TTL_SECONDS);

export function verifyLink(token: string): LinkPayload | null {
  try {
    const d = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
    return d && typeof d.m === 'string' && typeof d.c === 'string' ? { m: d.m, c: d.c } : null;
  } catch {
    return null;
  }
}
