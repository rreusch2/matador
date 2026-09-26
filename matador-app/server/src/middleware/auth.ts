import type { NextFunction, Request, Response } from 'express';

import { unauthorized } from '../lib/errors.js';
import { supabaseAuth, supabaseForUser } from '../lib/supabase.js';

/** Verifies the Supabase access token from `Authorization: Bearer <token>`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw unauthorized();

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) throw unauthorized();

  req.user = { id: data.user.id, email: data.user.email ?? null };
  req.db = supabaseForUser(token);
  next();
}

/** For handlers mounted behind requireAuth. */
export function authed(req: Request) {
  if (!req.user || !req.db) throw unauthorized();
  return { user: req.user, db: req.db };
}
