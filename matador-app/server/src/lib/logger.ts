import { pino } from 'pino';

import { isProd } from '../config/env.js';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.apikey'],
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,req,res,ms' } },
});
