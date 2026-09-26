import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { workoutsRouter } from './modules/workouts/workouts.routes.js';

const allowedOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // Native apps send no Origin header; browsers must be on the allow list.
      origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      customSuccessMessage: (req, res, ms) => `${req.method} ${req.url} ${res.statusCode} ${Math.round(ms)}ms`,
      customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
      customAttributeKeys: { responseTime: 'ms' },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
  app.use(globalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: Math.round(process.uptime()) });
  });

  app.use('/v1/workouts', workoutsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
