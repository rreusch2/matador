import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '../../config/env.js';
import { HttpError, notFound, tooMany } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { grokJson } from '../../lib/xai.js';
import { loadCatalog } from '../exercises/exercises.catalog.js';
import { MIN_MAIN_POOL, buildLibrary, resolvePlan, type Library } from '../exercises/exercises.library.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './workouts.prompt.js';
import {
  PLAN_JSON_SCHEMA,
  sanitizePlan,
  type GenerateInput,
  type Move,
  type PlanBody,
  type WorkoutPlan,
  type WorkoutPrefs,
} from './workouts.schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Without a library there is nothing to resolve refs against, so any the model invented are cleared. */
function stripIds(plan: PlanBody): Pick<PlanBody, 'warmup' | 'main' | 'finisher' | 'cooldown'> {
  const clear = (moves: Move[]) => moves.map((m) => ({ ...m, exerciseId: null, videoId: null }));
  return { warmup: clear(plan.warmup), main: clear(plan.main), finisher: clear(plan.finisher), cooldown: clear(plan.cooldown) };
}

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

/** The request's exercise shortlist, or null to fall back to free-text exercises. */
async function libraryFor(input: GenerateInput): Promise<Library | null> {
  try {
    const library = buildLibrary(await loadCatalog(), input);
    return library.main.length >= MIN_MAIN_POOL ? library : null;
  } catch (err) {
    logger.warn({ err }, 'exercise catalog unavailable, generating without it');
    return null;
  }
}

export async function generatePlan(db: SupabaseClient, userId: string, input: GenerateInput): Promise<WorkoutPlan> {
  await assertUnderDailyLimit(db, userId);

  const library = await libraryFor(input);
  const strict = input.goal !== 'mobility';
  const request = { system: SYSTEM_PROMPT, user: buildUserPrompt(input, library), schema: PLAN_JSON_SCHEMA };
  const parse = (data: unknown) => {
    const plan = sanitizePlan(data);
    if (!plan) return null;
    if (library) return resolvePlan(plan, library, strict);
    return { ...plan, ...stripIds(plan) };
  };

  // One retry if the output fails validation.
  let result = await grokJson(request);
  let plan = parse(result.data);
  if (!plan) {
    logger.warn('plan failed validation, retrying');
    result = await grokJson(request);
    plan = parse(result.data);
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

  const moves = [...plan.warmup, ...plan.main, ...plan.finisher, ...plan.cooldown];
  logger.info(
    {
      userId,
      planId: data.id,
      model: result.model,
      ms: result.latencyMs,
      tokens: result.tokens,
      library: library ? library.main.length + library.prep.length : 0,
      videos: moves.filter((m) => m.videoId).length,
      moves: moves.length,
    },
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
