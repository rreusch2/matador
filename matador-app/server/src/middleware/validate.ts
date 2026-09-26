import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

import { badRequest } from '../lib/errors.js';

/** Replaces req.body with the parsed value, or responds 400. */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      throw badRequest(first ? `Invalid ${first.path.join('.') || 'request'}.` : 'Invalid request.', 'invalid_input');
    }
    req.body = result.data;
    next();
  };
}
