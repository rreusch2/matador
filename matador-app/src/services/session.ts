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

const workOf = (m: Move) => m.workSeconds ?? parseSeconds(m.reps);
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
      reps: move.reps,
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
    },
  ];
  moves.forEach(({ section, move }, i) => {
    phases.push(...movePhases(move, section, i + 1, moves.length));
  });

  // Never finish on a rest countdown.
  while (phases.length > 1 && phases[phases.length - 1].kind === 'rest') phases.pop();
  return phases;
}

/** The classic work/rest/rounds loop, in the same shape. */
export function buildIntervalPhases(name: string, work: number, rest: number, rounds: number): Phase[] {
  const phases: Phase[] = [
    { kind: 'prep', seconds: PREP_SECONDS, title: 'GET READY', top: name, counter: `${rounds} ROUNDS`, cue: '', reps: '' },
  ];
  for (let round = 1; round <= rounds; round++) {
    const counter = `ROUND ${round} / ${rounds}`;
    phases.push({ kind: 'work', seconds: work, title: 'WORK', top: name, counter, cue: '', reps: '' });
    if (rest > 0 && round < rounds) {
      phases.push({ kind: 'rest', seconds: rest, title: 'REST', top: name, counter, cue: '', reps: '' });
    }
  }
  return phases;
}
