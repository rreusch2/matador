import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '../../config/env.js';
import { HttpError, notFound, tooMany } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { grokJson } from '../../lib/xai.js';
import { catalogBySlug, loadCatalog } from './catalog.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './workouts.prompt.js';
import {
  PLAN_JSON_SCHEMA,
  sanitizePlan,
  type GenerateInput,
  type PlanBody,
  type WorkoutPlan,
  type WorkoutPrefs,
} from './workouts.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type PlanRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  minutes: number;
  prefs: WorkoutPrefs & { notes?: string | null };
  plan: PlanBody;
};

function logAsFor(goal: WorkoutPrefs['goal']): WorkoutPlan['logAs'] {
  if (goal === 'mobility') return 'yoga';
  if (goal === 'fat' || goal === 'endurance') return 'hiit';
  return 'strength';
}

function toPlan(row: PlanRow): WorkoutPlan {
  const { notes, ...prefs } = row.prefs;
  return {
    ...row.plan,
    id: row.id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    minutes: row.minutes,
    prefs,
    notes: notes ?? null,
    logAs: logAsFor(prefs.goal),
  };
}

async function assertUnderDailyLimit(db: SupabaseClient, userId: string) {
  const { count, error } = await db
    .from('workout_plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - DAY_MS).toISOString());
  if (error) {
    logger.error({ err: error }, 'daily limit check failed');
    throw new HttpError(500, 'db_error', 'Something went wrong. Please try again.');
  }
  if ((count ?? 0) >= env.WORKOUT_DAILY_LIMIT) {
    throw tooMany(
      `You've built ${env.WORKOUT_DAILY_LIMIT} sessions in the last 24 hours. Come back a little later for more.`,
      'daily_limit'
    );
  }
}

export async function generatePlan(db: SupabaseClient, userId: string, input: GenerateInput): Promise<WorkoutPlan> {
  await assertUnderDailyLimit(db, userId);

  const catalog = await loadCatalog(db, input);
  const lookup = catalogBySlug(catalog);
  const request = { system: SYSTEM_PROMPT, user: buildUserPrompt(input, catalog), schema: PLAN_JSON_SCHEMA };

  // One retry if the output fails validation or leaves the catalog.
  let result = await grokJson(request);
  let plan = sanitizePlan(result.data, lookup);
  if (!plan) {
    logger.warn('plan failed validation, retrying');
    result = await grokJson(request);
    plan = sanitizePlan(result.data, lookup);
  }
  if (!plan) throw new HttpError(502, 'ai_failed', 'Could not build your workout. Please try again.');

  const prefs: WorkoutPrefs = {
    goal: input.goal,
    focus: input.focus,
    minutes: input.minutes,
    equipment: input.equipment,
    level: input.level,
  };

  const { data, error } = await db
    .from('workout_plans')
    .insert({
      user_id: userId,
      title: plan.title,
      minutes: input.minutes,
      prefs: { ...prefs, notes: input.notes || null },
      plan,
      model: result.model,
      latency_ms: result.latencyMs,
    })
    .select('id, created_at, completed_at, minutes, prefs, plan')
    .single<PlanRow>();

  if (error || !data) {
    logger.error({ err: error }, 'saving plan failed');
    throw new HttpError(500, 'db_error', 'Your workout was built but could not be saved. Please try again.');
  }

  logger.info(
    { userId, planId: data.id, model: result.model, ms: result.latencyMs, tokens: result.tokens },
    'workout generated'
  );
  return toPlan(data);
}

export async function listPlans(db: SupabaseClient, limit = 20): Promise<WorkoutPlan[]> {
  const { data, error } = await db
    .from('workout_plans')
    .select('id, created_at, completed_at, minutes, prefs, plan')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<PlanRow[]>();
  if (error) throw new HttpError(500, 'db_error', 'Could not load your sessions.');
  return (data ?? []).map(toPlan);
}

export async function completePlan(db: SupabaseClient, planId: string): Promise<void> {
  const { data, error } = await db
    .from('workout_plans')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', planId)
    .select('id');
  if (error) throw new HttpError(500, 'db_error', 'Could not update your session.');
  if (!data?.length) throw notFound('Session not found.');
}
