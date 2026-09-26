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

const MAIN_POOL = 32;
const PREP_POOL = 14;
/** A single-focus day should stay a short menu, not the whole catalog. */
const BUCKET_CAP = 12;
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
  // Deadlifts are tagged "Back" in the catalog. They still belong on a lower-body day.
  if (ex.patterns[0] === 'Hip Hinge') return 'lower';
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

// Longest first so "double dumbbell" is removed before "dumbbell", and "high bar" before shorter words.
const NAME_PREFIXES = [
  'double dumbbell',
  'double kettlebell',
  'single arm dumbbell',
  'single arm kettlebell',
  'single arm cable',
  'single arm',
  'dumbbell',
  'kettlebell',
  'barbell',
  'bodyweight',
  'cable',
  'ez bar',
  'miniband',
  'superband',
  'resistance band',
  'bar',
];
const NEUTRAL_WORDS = ['high bar', 'low bar', 'wide grip', 'close grip', 'reverse grip', 'neutral grip', 'incline', 'decline', 'seated', 'standing', 'conventional', 'sumo', 'kneeling', 'diamond'];
const CANON = new Set([
  'squat', 'back squat', 'front squat', 'goblet squat', 'bench press', 'deadlift', 'romanian deadlift', 'hip thrust',
  'glute bridge', 'overhead press', 'bent over row', 'pendlay row', 'upright row', 'lat pulldown', 'seated row',
  'pull up', 'chin up', 'push up', 'reverse lunge', 'walking lunge', 'forward lunge', 'lateral lunge',
  'bulgarian split squat', 'split squat', 'lunge', 'side plank', 'forearm plank', 'plank', 'dead bug', 'bird dog',
  'calf raise', 'bicep curl', 'hammer curl', 'tricep pushdown', 'tricep extension', 'lateral raise', 'front raise',
  'face pull', 'chest fly', 'reverse fly', 'good morning', 'mountain climber', 'burpee', 'bicycle crunch', 'crunch',
  'sit up', 'step up', 'suitcase carry', 'shrug', 'push press', 'floor press', 'pallof press', 'inverted row',
  'glute kickback', 'swing', 'dip', 'dips', 'leg raise', 'knee raise', 'skull crusher',
]);
const EXOTIC = /\b(clubbell|macebell|mace|slider|bottoms up|seesaw|cossack|zercher|jefferson|sots|turkish|windmill|get up|archer|muscle up|front lever|back lever|planche)\b/;
const SPICY = /\b(half kneeling|tall kneeling|contralateral|ipsilateral|offset|deficit|eccentric|isometric|alternating|single leg|single arm|feet elevated|foot elevated|pause|bottoms)\b/;
const MAINSTAY_GEAR = new Set(['Barbell', 'Dumbbell', 'Cable', 'Bodyweight', 'Pull Up Bar', 'EZ Bar']);

/** Names a coach reaches for before anything clever. Gear caps cannot push these out. */
const CLASSICS = new Set([
  'barbell bench press',
  'barbell incline bench press',
  'barbell high bar back squat',
  'barbell front squat',
  'barbell conventional deadlift',
  'barbell romanian deadlift',
  'barbell hip thrust',
  'barbell overhead press',
  'barbell bent over row',
  'dumbbell goblet squat',
  'kettlebell goblet squat',
  'kettlebell swing',
  'double dumbbell bench press',
  'double dumbbell bent over row',
  'double dumbbell romanian deadlift',
  'bodyweight squat',
  'bodyweight push up',
  'bodyweight reverse lunge',
  'bodyweight walking lunge',
  'bodyweight glute bridge',
  'bodyweight forearm plank',
  'bodyweight dead bug',
  'bar pull up',
  'bar chin up',
  'cable wide grip lat pulldown',
  'cable face pull',
]);

/** 6 = a standard exercise, 2.2 = a normal variation of one, 0 = specialty. */
function familiarity(name: string): number {
  const n = name.toLowerCase();
  if (EXOTIC.test(n)) return 0;
  let rest = n;
  for (const prefix of NAME_PREFIXES) {
    if (rest.startsWith(`${prefix} `)) {
      rest = rest.slice(prefix.length + 1);
      break;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const word of NEUTRAL_WORDS) {
      if (rest.startsWith(`${word} `)) {
        rest = rest.slice(word.length + 1);
        changed = true;
        break;
      }
    }
  }
  if (!CANON.has(rest)) return 0;
  return SPICY.test(n) ? 2.2 : 6;
}

const isClassic = (name: string) => CLASSICS.has(name.toLowerCase());

function score(ex: CatalogExercise, input: GenerateInput, rand: () => number) {
  // Small shuffle so two sessions are not identical. It cannot outrank a basic lift.
  let s = rand() * 0.8;
  if (ex.videoId) s += 3;
  s += familiarity(ex.name);
  if (isClassic(ex.name)) s += 3;
  if (GOAL_CLASSES[input.goal].has(ex.classification)) s += 2;
  if (input.goal === 'muscle' && ex.mechanics === 'Compound') s += 0.5;
  if (ex.combo) s -= input.level === 'beginner' ? 3 : 1;
  s -= Math.max(0, ex.name.split(' ').length - 3) * 1.1;
  if (input.equipment === 'dumbbells' && ex.primaryEquipment === 'Dumbbell') s += 1.5;
  if (input.equipment === 'bands' && BANDS.has(ex.primaryEquipment)) s += 1.5;
  if (input.equipment === 'gym') s += MAINSTAY_GEAR.has(ex.primaryEquipment) ? 1.6 : -1.2;
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
    const overPattern = (patterns.get(pattern) ?? 0) >= patternCap;
    const overGear = (gear.get(ex.primaryEquipment) ?? 0) >= gearCap;
    // Bench, squat, deadlift and the other classics are never dropped to make room for a miniband variation.
    if (overPattern || (overGear && !isClassic(ex.name))) {
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

/**
 * Staples fill the menu first. A few normal variations may top it up.
 * Specialty moves are only added when a bucket would otherwise be almost empty.
 */
function fillBucket(list: { ex: CatalogExercise; s: number }[], quota: number, mixGear: boolean) {
  const staples = list.filter(({ ex }) => familiarity(ex.name) >= 6);
  const picked = spread(staples, quota, mixGear);
  if (picked.length >= quota) return picked;

  const have = new Set(picked.map((ex) => ex.slug));
  const room = Math.min(quota - picked.length, 4);
  const variations = list.filter(({ ex }) => !have.has(ex.slug) && familiarity(ex.name) >= 2);
  picked.push(...spread(variations, room, mixGear));
  if (picked.length >= Math.min(6, quota)) return picked;

  const haveMore = new Set(picked.map((ex) => ex.slug));
  const rest = list.filter(({ ex }) => !haveMore.has(ex.slug));
  picked.push(...spread(rest, quota - picked.length, mixGear));
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

  const quota = Math.min(BUCKET_CAP, Math.ceil(MAIN_POOL / buckets.length));
  const main = buckets.flatMap((b) => fillBucket(pools.get(b) ?? [], quota, input.equipment === 'gym'));
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
