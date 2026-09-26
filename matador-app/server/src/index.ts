import { networkInterfaces } from 'node:os';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const server = createApp().listen(env.PORT, env.HOST, () => {
  const lan = lanAddress();
  logger.info(`Matador API running on http://localhost:${env.PORT}${lan ? `  (phone: http://${lan}:${env.PORT})` : ''}`);
  logger.info(`Model: ${env.XAI_MODEL}  |  daily limit: ${env.WORKOUT_DAILY_LIMIT} per user`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
