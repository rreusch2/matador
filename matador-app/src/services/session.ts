import type { Move, WorkoutPlan } from '@/services/workouts';

/** One screen of a guided run-through. `reps` phases wait for the athlete to tap. */
export type Phase = {
  kind: 'prep' | 'work' | 'rest' | 'reps';
  /** 0 for `reps` phases, which have no countdown. */
  seconds: number;
  /** The large headline: an exercise name, REST, or GET READY. */
  title: string;
  /** Small line above the headline, e.g. "MAIN WORK - SET 2 / 3". */
  top: string;
  /** Small line below the clock, e.g. "EXERCISE 4 / 12". */
  counter: string;
  cue: string;
  /** Shown in place of the clock on `reps` phases. */
  reps: string;
  /** YouTube demo. Prep and rest phases preview the exercise that comes next. */
  videoId: string | null;
  /** On a rest that leads into a different exercise, the name that video is previewing. */
  upNext?: string | null;
};

export const PREP_SECONDS = 5;

const DOT = ' \u00B7 ';

/**
 * Reads a duration out of free text like "45s", "2 min" or "1:30".
 * Used for plans saved before the model started returning exact seconds.
 */
export function parseSeconds(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();

  const clock = t.match(/(\d+)\s*:\s*([0-5]?\d)/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const mins = t.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/);
  if (mins) return Math.round(Number(mins[1]) * 60);

  const secs = t.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/);
  if (secs) return Number(secs[1]);

  const bare = t.match(/^\s*(\d{1,3})\s*$/);
  if (bare) return Number(bare[1]);

  return null;
}

const TIME_UNIT =
  /\d+\s*(?:s|sec|secs|seconds)\b|\d+(?:\.\d+)?\s*(?:m|min|mins|minutes)\b|\d+\s*:\s*\d+/i;
/** Movements you count. A model often writes these as "6s" during a warm-up. */
const COUNTED =
  /\b(push[\s-]?ups?|squats?|lunges?|deadlifts?|rows?|press(?:es)?|curls?|raises?|pull[\s-]?ups?|chin[\s-]?ups?|dips?|thrusts?|bridges?|step[\s-]?ups?|good mornings?|crunches|sit[\s-]?ups?|swings?|kickbacks?|flies|pulldowns?|shrugs?)\b/i;
const HOLD = /\b(holds?|stretches?|planks?|poses?|breaths?|breathing|isometrics?)\b/i;

const countedMove = (name: string) => COUNTED.test(name) && !HOLD.test(name);

/** A countdown only when the prescription is actually time, not a rep count. */
function workOf(m: Move): number | null {
  if (countedMove(m.name)) return null;
  if (!TIME_UNIT.test(m.reps)) return null;
  return m.workSeconds ?? parseSeconds(m.reps);
}

/** "6s" on a push-up is 6 reps. */
function displayReps(m: Move): string {
  if (!countedMove(m.name)) return m.reps;
  const reps = m.reps.replace(/\s*(?:s|sec|secs|seconds)\b/gi, '').trim();
  return reps || m.reps;
}

const restOf = (m: Move) => m.restSeconds ?? parseSeconds(m.rest);

function movePhases(move: Move, section: string, index: number, total: number): Phase[] {
  const work = workOf(move);
  const rest = restOf(move);
  const sets = Math.min(Math.max(move.sets ?? 1, 1), 8);
  const counter = `EXERCISE ${index} / ${total}`;
  const phases: Phase[] = [];

  for (let set = 1; set <= sets; set++) {
    const top = sets > 1 ? `${section}${DOT}SET ${set} / ${sets}` : section;
    phases.push({
      kind: work ? 'work' : 'reps',
      seconds: work ?? 0,
      title: move.name,
      top,
      counter,
      cue: move.cue,
      reps: displayReps(move),
      videoId: move.videoId ?? null,
    });
    if (rest) {
      phases.push({
        kind: 'rest',
        seconds: rest,
        title: 'REST',
        top: `${section}${DOT}${move.name}`,
        counter,
        cue: '',
        reps: '',
        videoId: null,
      });
    }
  }
  return phases;
}

/** Expands a plan into every set, rest and stretch, in order. */
export function buildSessionPhases(plan: WorkoutPlan): Phase[] {
  const sections: [string, Move[]][] = [
    ['WARM-UP', plan.warmup],
    ['MAIN WORK', plan.main],
    ['FINISHER', plan.finisher],
    ['COOL-DOWN', plan.cooldown],
  ];
  const moves = sections.flatMap(([section, list]) => list.map((move) => ({ section, move })));

  const phases: Phase[] = [
    {
      kind: 'prep',
      seconds: PREP_SECONDS,
      title: 'GET READY',
      top: plan.title,
      counter: `${moves.length} EXERCISES`,
      cue: '',
      reps: '',
      videoId: null,
    },
  ];
  moves.forEach(({ section, move }, i) => {
    phases.push(...movePhases(move, section, i + 1, moves.length));
  });

  // Never finish on a rest countdown.
  while (phases.length > 1 && phases[phases.length - 1].kind === 'rest') phases.pop();

  let upcoming: string | null = null;
  for (let i = phases.length - 1; i >= 0; i--) {
    const p = phases[i];
    if (p.kind === 'work' || p.kind === 'reps') upcoming = p.videoId;
    else p.videoId = upcoming;
  }

  const exerciseAt = (start: number, step: number) => {
    for (let i = start; i >= 0 && i < phases.length; i += step) {
      const kind = phases[i].kind;
      if (kind === 'work' || kind === 'reps') return phases[i].title;
    }
    return null;
  };
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (phase.kind !== 'rest') continue;
    const nextName = exerciseAt(i + 1, 1);
    const prevName = exerciseAt(i - 1, -1);
    if (nextName && nextName !== prevName) {
      phase.upNext = nextName;
      phase.top = 'NEXT EXERCISE';
    }
  }
  return phases;
}

/** The classic work/rest/rounds loop, in the same shape. */
export function buildIntervalPhases(name: string, work: number, rest: number, rounds: number): Phase[] {
  const phases: Phase[] = [
    {
      kind: 'prep',
      seconds: PREP_SECONDS,
      title: 'GET READY',
      top: name,
      counter: `${rounds} ROUNDS`,
      cue: '',
      reps: '',
      videoId: null,
    },
  ];
  for (let round = 1; round <= rounds; round++) {
    const counter = `ROUND ${round} / ${rounds}`;
    phases.push({ kind: 'work', seconds: work, title: 'WORK', top: name, counter, cue: '', reps: '', videoId: null });
    if (rest > 0 && round < rounds) {
      phases.push({ kind: 'rest', seconds: rest, title: 'REST', top: name, counter, cue: '', reps: '', videoId: null });
    }
  }
  return phases;
}
