import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const message = (text: string, code: string) => ({ error: text, code });

/** Broad protection for every route, keyed by IP. */
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Slow down a little.', 'rate_limited'),
});

/** Burst protection for expensive endpoints, keyed by user (falls back to IP). Use after requireAuth. */
export function userBurstLimiter(limit: number, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
    message: message('You are going a little fast. Give it a few seconds.', 'rate_limited'),
  });
}
