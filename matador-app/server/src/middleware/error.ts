import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../lib/errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found.', code: 'not_found' });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    if (err.status >= 500) req.log.error({ err }, err.message);
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  // Malformed JSON bodies from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON.', code: 'invalid_json' });
    return;
  }
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'server_error' });
}
