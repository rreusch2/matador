import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  /** Comma-separated list of allowed browser origins. Native apps send no Origin header and are always allowed. */
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:8082'),

  SUPABASE_URL: z.url(),
  /** The publishable (sb_publishable_...) or legacy anon key. Requests run as the signed-in user under RLS. */
  SUPABASE_KEY: z.string().min(20),

  XAI_API_KEY: z.string().min(10),
  XAI_MODEL: z.string().default('grok-4.3'),
  XAI_REASONING_EFFORT: z.enum(['none', 'low', 'medium', 'high', '']).default('low'),
  XAI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  WORKOUT_DAILY_LIMIT: z.coerce.number().int().positive().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('\nInvalid or missing environment variables (see server/.env.example):');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  console.error('');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
