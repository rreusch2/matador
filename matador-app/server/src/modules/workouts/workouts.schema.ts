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

export type Move = {
  slug: string;
  name: string;
  demo: string | null;
  sets: number | null;
  reps: string;
  rest: string | null;
  cue: string;
  /** Seconds per set when the move is done for time, else null. Drives the guided session timer. */
  workSeconds: number | null;
  /** Rest between sets in seconds, else null. */
  restSeconds: number | null;
};

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
    slug: { type: 'string' },
    sets: { type: ['integer', 'null'] },
    reps: { type: 'string' },
    rest: { type: ['string', 'null'] },
    cue: { type: 'string' },
    workSeconds: { type: ['integer', 'null'] },
    restSeconds: { type: ['integer', 'null'] },
  },
  required: ['slug', 'sets', 'reps', 'rest', 'cue', 'workSeconds', 'restSeconds'],
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

const seconds = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.min(Math.round(v), max) : null;

export type CatalogLookup = {
  slugs: Map<string, { slug: string; name: string; demo: string | null }>;
  names: Map<string, { slug: string; name: string; demo: string | null }>;
};

function cleanMove(raw: unknown, catalog: CatalogLookup): Move | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const slugOrName = clean(r.slug, 80) || clean(r.name, 80);
  const reps = clean(r.reps, 18);
  if (!slugOrName || !reps) return null;
  const hit =
    catalog.slugs.get(slugOrName) ||
    catalog.slugs.get(slugOrName.toLowerCase()) ||
    catalog.names.get(slugOrName.toLowerCase());
  if (!hit) return null;
  const sets =
    typeof r.sets === 'number' && Number.isFinite(r.sets) ? Math.min(Math.max(Math.round(r.sets), 1), 8) : null;
  return {
    slug: hit.slug,
    name: hit.name,
    demo: hit.demo && /^https?:\/\//i.test(hit.demo) ? hit.demo : null,
    sets,
    reps,
    rest: clean(r.rest, 12) || null,
    cue: clean(r.cue, 100),
    workSeconds: seconds(r.workSeconds, 5, 900),
    restSeconds: seconds(r.restSeconds, 5, 600),
  };
}

const cleanList = (v: unknown, max: number, catalog: CatalogLookup, used: Set<string>) =>
  (Array.isArray(v) ? v : [])
    .map((item) => cleanMove(item, catalog))
    .filter((m): m is Move => {
      if (!m || used.has(m.slug)) return false;
      used.add(m.slug);
      return true;
    })
    .slice(0, max);

/** Returns a safe plan, or null when the output is unusable. */
export function sanitizePlan(raw: unknown, catalog: CatalogLookup): PlanBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const used = new Set<string>();
  const warmup = cleanList(r.warmup, 5, catalog, used);
  const main = cleanList(r.main, 9, catalog, used);
  const finisher = cleanList(r.finisher, 1, catalog, used);
  const cooldown = cleanList(r.cooldown, 4, catalog, used);
  if (main.length < 2 || warmup.length < 1 || cooldown.length < 1) return null;
  return {
    title: clean(r.title, 32).toUpperCase() || 'YOUR SESSION',
    summary: clean(r.summary, 140),
    intensity: r.intensity === 'low' || r.intensity === 'high' ? r.intensity : 'moderate',
    coachNote: clean(r.coachNote, 240),
    warmup,
    main,
    finisher,
    cooldown,
  };
}
