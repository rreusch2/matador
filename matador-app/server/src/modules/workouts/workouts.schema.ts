import { z } from 'zod';

export const GOALS = ['muscle', 'fat', 'endurance', 'mobility'] as const;
export const FOCUSES = ['full', 'upper', 'lower', 'push', 'pull', 'core'] as const;
export const EQUIPMENT = ['gym', 'dumbbells', 'bodyweight', 'bands'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const generateInput = z.object({
  goal: z.enum(GOALS),
  focus: z.enum(FOCUSES),
  minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  equipment: z.enum(EQUIPMENT),
  level: z.enum(LEVELS),
  notes: z
    .string()
    .max(400)
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, ' ').trim().slice(0, 200) : '')),
  /** Main exercises from the previous version, so a "new version" is genuinely different. */
  avoid: z.array(z.string().trim().min(1).max(60)).max(12).optional().default([]),
});

export type GenerateInput = z.infer<typeof generateInput>;
export type WorkoutPrefs = Pick<GenerateInput, 'goal' | 'focus' | 'minutes' | 'equipment' | 'level'>;

export type Move = { name: string; sets: number | null; reps: string; rest: string | null; cue: string };

export type PlanBody = {
  title: string;
  summary: string;
  intensity: 'low' | 'moderate' | 'high';
  coachNote: string;
  warmup: Move[];
  main: Move[];
  finisher: Move[];
  cooldown: Move[];
};

export type WorkoutPlan = PlanBody & {
  id: string;
  createdAt: string;
  minutes: number;
  prefs: WorkoutPrefs;
  notes: string | null;
  logAs: 'strength' | 'hiit' | 'yoga';
  completedAt: string | null;
};

// ---------------------------------------------------------------------------
// Structured output schema sent to the model (strict mode: every key required).
// ---------------------------------------------------------------------------

const move = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    sets: { type: ['integer', 'null'] },
    reps: { type: 'string' },
    rest: { type: ['string', 'null'] },
    cue: { type: 'string' },
  },
  required: ['name', 'sets', 'reps', 'rest', 'cue'],
  additionalProperties: false,
};

export const PLAN_JSON_SCHEMA = {
  name: 'workout_plan',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      intensity: { type: 'string', enum: ['low', 'moderate', 'high'] },
      coachNote: { type: 'string' },
      warmup: { type: 'array', items: move },
      main: { type: 'array', items: move },
      finisher: { type: 'array', items: move },
      cooldown: { type: 'array', items: move },
    },
    required: ['title', 'summary', 'intensity', 'coachNote', 'warmup', 'main', 'finisher', 'cooldown'],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Output sanitizing. Never trust model output blindly.
// ---------------------------------------------------------------------------

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';

function cleanMove(raw: unknown): Move | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = clean(r.name, 48);
  const reps = clean(r.reps, 18);
  if (!name || !reps) return null;
  const sets =
    typeof r.sets === 'number' && Number.isFinite(r.sets) ? Math.min(Math.max(Math.round(r.sets), 1), 8) : null;
  return { name, sets, reps, rest: clean(r.rest, 12) || null, cue: clean(r.cue, 100) };
}

const cleanList = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map(cleanMove).filter((m): m is Move => !!m).slice(0, max);

/** Returns a safe plan, or null when the output is unusable. */
export function sanitizePlan(raw: unknown): PlanBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const main = cleanList(r.main, 9);
  const warmup = cleanList(r.warmup, 5);
  const cooldown = cleanList(r.cooldown, 4);
  if (main.length < 2 || warmup.length < 1 || cooldown.length < 1) return null;
  return {
    title: clean(r.title, 32).toUpperCase() || 'YOUR SESSION',
    summary: clean(r.summary, 140),
    intensity: r.intensity === 'low' || r.intensity === 'high' ? r.intensity : 'moderate',
    coachNote: clean(r.coachNote, 240),
    warmup,
    main,
    finisher: cleanList(r.finisher, 1),
    cooldown,
  };
}
