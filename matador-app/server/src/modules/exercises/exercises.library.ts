import type { GenerateInput, Move, PlanBody } from '../workouts/workouts.schema.js';

export type CatalogExercise = {
  slug: string;
  name: string;
  videoId: string | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  target: string;
  primeMover: string;
  primaryEquipment: string;
  secondaryEquipment: string;
  patterns: string[];
  region: string;
  mechanics: string;
  classification: string;
  combo: boolean;
};

/** The shortlist sent to the model for one request. Short refs ("e12") keep the prompt small. */
export type Library = {
  main: { ref: string; ex: CatalogExercise }[];
  prep: { ref: string; ex: CatalogExercise }[];
  byRef: Map<string, CatalogExercise>;
};

const MAIN_POOL = 60;
const PREP_POOL = 14;
/** Below this, the library is too thin to force every main move through it. */
export const MIN_MAIN_POOL = 8;

// ---------------------------------------------------------------------------
// Equipment. The app offers four setups; the catalog has 30+ kinds of gear.
// ---------------------------------------------------------------------------

const BANDS = new Set(['Resistance Band', 'Superband', 'Miniband']);
const BENCHES = new Set(['Bench (Flat)', 'Bench (Incline)', 'Bench (Decline)']);

/** What a typical commercial gym has. Clubbells, maces, tires and the like are left out. */
const GYM_PRIMARY = new Set([
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'EZ Bar',
  'Trap Bar',
  'Landmine',
  'Bodyweight',
  'Pull Up Bar',
  'Weight Plate',
  'Stability Ball',
  'Medicine Ball',
  'Slam Ball',
  'Wall Ball',
  'Battle Ropes',
  'Sled',
  'Ab Wheel',
  'Suspension Trainer',
  ...BANDS,
]);
const GYM_SECONDARY_EXCLUDED = new Set([
  'Clubbell',
  'Macebell',
  'Sandbag',
  'Bulgarian Bag',
  'Sledge Hammer',
  'Gravity Boots',
  'Parallette Bars',
  'Slant Board',
]);

function fitsEquipment(ex: CatalogExercise, equipment: GenerateInput['equipment']) {
  const primary = ex.primaryEquipment;
  const secondary = ex.secondaryEquipment;
  switch (equipment) {
    case 'bodyweight':
      return primary === 'Bodyweight' && !secondary;
    case 'dumbbells':
      return (primary === 'Dumbbell' || primary === 'Bodyweight') && (!secondary || BENCHES.has(secondary) || secondary === 'Dumbbell');
    case 'bands':
      return (BANDS.has(primary) || primary === 'Bodyweight') && (!secondary || BANDS.has(secondary));
    case 'gym':
      return GYM_PRIMARY.has(primary) && !GYM_SECONDARY_EXCLUDED.has(secondary);
  }
}

// ---------------------------------------------------------------------------
// Level. The catalog rates exercise complexity, so advanced athletes still get the fundamentals.
// ---------------------------------------------------------------------------

const LEVELS_FOR: Record<GenerateInput['level'], CatalogExercise['level'][]> = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['beginner', 'intermediate', 'advanced'],
};

// ---------------------------------------------------------------------------
// Focus. Each exercise lands in one bucket based on the muscle it targets.
// ---------------------------------------------------------------------------

type Bucket = 'lower' | 'push' | 'pull' | 'core';

const LOWER = new Set(['Quadriceps', 'Glutes', 'Hamstrings', 'Calves', 'Adductors', 'Abductors', 'Hip Flexors', 'Shins']);
const PUSH = new Set(['Chest', 'Triceps']);
const PULL = new Set(['Back', 'Biceps', 'Forearms', 'Trapezius']);

function bucketOf(ex: CatalogExercise): Bucket | null {
  if (LOWER.has(ex.target)) return 'lower';
  if (ex.target === 'Abdominals') return 'core';
  if (PUSH.has(ex.target)) return 'push';
  if (PULL.has(ex.target)) return 'pull';
  if (ex.target === 'Shoulders') return ex.primeMover === 'Posterior Deltoids' ? 'pull' : 'push';
  return null;
}

const FOCUS_BUCKETS: Record<GenerateInput['focus'], Bucket[]> = {
  full: ['lower', 'push', 'pull', 'core'],
  upper: ['push', 'pull'],
  lower: ['lower'],
  push: ['push'],
  pull: ['pull'],
  core: ['core'],
};

// ---------------------------------------------------------------------------
// Goal. Nudges the shortlist toward the right training style without excluding anything.
// ---------------------------------------------------------------------------

const MOBILITY_CLASSES = new Set(['Mobility', 'Balance', 'Postural', 'Animal Flow']);

const GOAL_CLASSES: Record<GenerateInput['goal'], Set<string>> = {
  muscle: new Set(['Bodybuilding', 'Powerlifting', 'Grinds']),
  fat: new Set(['Ballistics', 'Plyometric', 'Calisthenics']),
  endurance: new Set(['Calisthenics', 'Ballistics', 'Plyometric']),
  mobility: MOBILITY_CLASSES,
};

function score(ex: CatalogExercise, input: GenerateInput, rand: () => number) {
  let s = rand() * 2.5;
  if (ex.videoId) s += 3;
  if (GOAL_CLASSES[input.goal].has(ex.classification)) s += 2;
  if (input.goal === 'muscle' && ex.mechanics === 'Compound') s += 0.5;
  if (ex.combo) s -= input.level === 'beginner' ? 3 : 1;
  // Long names stack modifiers ("Double Dumbbell Half Kneeling Seesaw Press"); fundamentals are short.
  s -= Math.max(0, ex.name.split(' ').length - 3) * 0.7;
  // Bodyweight fits every setup, so the gear the athlete picked gets priority.
  if (input.equipment === 'dumbbells' && ex.primaryEquipment === 'Dumbbell') s += 1.5;
  if (input.equipment === 'bands' && BANDS.has(ex.primaryEquipment)) s += 1.5;
  return s;
}

/**
 * Takes the best `quota` exercises while spreading them across movement patterns
 * (and, in a full gym, across gear) so a lower-body pool is not 15 kettlebell squat variations.
 */
function spread(list: { ex: CatalogExercise; s: number }[], quota: number, mixGear: boolean) {
  const sorted = [...list].sort((a, b) => b.s - a.s);
  const patternCap = Math.max(2, Math.ceil(quota / 3));
  const gearCap = mixGear ? Math.max(2, Math.ceil(quota * 0.4)) : Infinity;
  const patterns = new Map<string, number>();
  const gear = new Map<string, number>();
  const picked: CatalogExercise[] = [];
  const skipped: CatalogExercise[] = [];

  for (const { ex } of sorted) {
    if (picked.length >= quota) break;
    const pattern = ex.patterns[0] ?? 'other';
    if ((patterns.get(pattern) ?? 0) >= patternCap || (gear.get(ex.primaryEquipment) ?? 0) >= gearCap) {
      skipped.push(ex);
      continue;
    }
    patterns.set(pattern, (patterns.get(pattern) ?? 0) + 1);
    gear.set(ex.primaryEquipment, (gear.get(ex.primaryEquipment) ?? 0) + 1);
    picked.push(ex);
  }
  // Thin pools: fill the rest in score order, ignoring the caps.
  for (const ex of skipped) {
    if (picked.length >= quota) break;
    picked.push(ex);
  }
  return picked;
}

/** Builds this request's shortlist. `rand` is injectable so selection is testable. */
export function buildLibrary(
  catalog: CatalogExercise[],
  input: GenerateInput,
  rand: () => number = Math.random
): Library {
  const avoid = new Set(input.avoid.map((n) => n.toLowerCase()));
  const levels = new Set(LEVELS_FOR[input.level]);
  const buckets = FOCUS_BUCKETS[input.focus];
  const usable = catalog.filter(
    (ex) => fitsEquipment(ex, input.equipment) && levels.has(ex.level) && !avoid.has(ex.name.toLowerCase())
  );

  const pools = new Map<Bucket, { ex: CatalogExercise; s: number }[]>(buckets.map((b) => [b, []]));
  for (const ex of usable) {
    if (input.goal === 'mobility' && !MOBILITY_CLASSES.has(ex.classification)) continue;
    const bucket = bucketOf(ex);
    if (bucket && pools.has(bucket)) pools.get(bucket)!.push({ ex, s: score(ex, input, rand) });
  }

  const quota = Math.ceil(MAIN_POOL / buckets.length);
  const main = buckets.flatMap((b) => spread(pools.get(b) ?? [], quota, input.equipment === 'gym'));
  const chosen = new Set(main.map((ex) => ex.slug));

  // Warm-up and cool-down options: simple, low-skill bodyweight or mobility work.
  const prepCandidates = catalog
    .filter(
      (ex) =>
        !chosen.has(ex.slug) &&
        ex.level === 'beginner' &&
        !ex.combo &&
        ex.primaryEquipment === 'Bodyweight' &&
        !ex.secondaryEquipment &&
        (MOBILITY_CLASSES.has(ex.classification) || buckets.includes(bucketOf(ex) as Bucket))
    )
    .map((ex) => ({ ex, s: score(ex, { ...input, goal: 'mobility' }, rand) }));
  const prep = spread(prepCandidates, PREP_POOL, false);

  let n = 0;
  const byRef = new Map<string, CatalogExercise>();
  const tag = (ex: CatalogExercise) => {
    const ref = `e${++n}`;
    byRef.set(ref, ex);
    return { ref, ex };
  };
  return { main: main.map(tag), prep: prep.map(tag), byRef };
}

const line = ({ ref, ex }: { ref: string; ex: CatalogExercise }) =>
  [ref, ex.name, ex.target, ex.patterns.slice(0, 2).join('/') || '-', ex.mechanics || '-'].join(' | ');

/** The shortlist as prompt text. */
export function formatLibrary(library: Library) {
  const lines = ['EXERCISE LIBRARY (id | name | target | pattern | mechanics)', ...library.main.map(line)];
  if (library.prep.length) {
    lines.push('', 'WARM-UP AND COOL-DOWN OPTIONS (optional)', ...library.prep.map(line));
  }
  return lines.join('\n');
}

/**
 * Swaps the model's short refs for real catalog entries: canonical name, slug and demo video.
 * Main and finisher moves that are not from the library are dropped when `strict`.
 * Returns null when too little survives, so the caller can retry.
 */
export function resolvePlan(plan: PlanBody, library: Library, strict: boolean): PlanBody | null {
  const resolve = (moves: Move[], required: boolean) =>
    moves.flatMap((move): Move[] => {
      const ex = move.exerciseId ? library.byRef.get(move.exerciseId) : undefined;
      if (ex) return [{ ...move, name: ex.name, exerciseId: ex.slug, videoId: ex.videoId }];
      if (required && strict) return [];
      return [{ ...move, exerciseId: null, videoId: null }];
    });

  const main = resolve(plan.main, true);
  if (main.length < 2) return null;
  return {
    ...plan,
    warmup: resolve(plan.warmup, false),
    main,
    finisher: resolve(plan.finisher, true),
    cooldown: resolve(plan.cooldown, false),
  };
}
