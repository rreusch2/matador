import { useSyncExternalStore } from 'react';

import type { WorkoutType } from '@/context/fitness';
import { supabase } from '@/lib/supabase';
import type { Focus } from '@/services/workouts';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const PROGRAM_MINUTES = [15, 30, 45, 60] as const;

const TYPES = new Set<WorkoutType>(['strength', 'run', 'hiit', 'cycle', 'yoga', 'sport']);
const FOCUSES = new Set<Focus>(['full', 'upper', 'lower', 'push', 'pull', 'core']);
const MINUTES = new Set<number>(PROGRAM_MINUTES);

export type ProgramMinutes = (typeof PROGRAM_MINUTES)[number];

export type ProgramDay = {
  rest: boolean;
  type: WorkoutType | null;
  focus: Focus | null;
  minutes: ProgramMinutes | null;
  note: string;
};

export type Program = {
  name: string;
  days: ProgramDay[];
};

type Store = {
  program: Program | null;
  loaded: boolean;
  error: string | null;
};

let state: Store = { program: null, loaded: false, error: null };
let generation = 0;
const listeners = new Set<() => void>();

function emit(patch: Partial<Store>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function blankWeek(): ProgramDay[] {
  return Array.from({ length: 7 }, () => ({ rest: true, type: null, focus: null, minutes: null, note: '' }));
}

export function blankProgram(): Program {
  return { name: 'My Program', days: blankWeek() };
}

/** Monday is 0, matching the program week. */
export function mondayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

function asDay(value: unknown): ProgramDay {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const rest = row.rest !== false;
  const type = typeof row.type === 'string' && TYPES.has(row.type as WorkoutType) ? (row.type as WorkoutType) : null;
  const focus = typeof row.focus === 'string' && FOCUSES.has(row.focus as Focus) ? (row.focus as Focus) : null;
  const minutes = typeof row.minutes === 'number' && MINUTES.has(row.minutes) ? (row.minutes as ProgramMinutes) : null;
  const note = typeof row.note === 'string' ? row.note.slice(0, 40) : '';
  if (rest || !type) return { rest: true, type: null, focus: null, minutes: null, note: '' };
  return { rest: false, type, focus: type === 'strength' ? focus : null, minutes, note };
}

function parseDays(value: unknown): ProgramDay[] | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  return value.map(asDay);
}

export const programStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  async refresh() {
    const gen = generation;
    const { data, error } = await supabase.from('training_programs').select('name, days').maybeSingle();
    if (gen !== generation) return;
    if (error) {
      emit({ loaded: true, error: 'Could not load your program.' });
      return;
    }
    if (!data) {
      emit({ program: null, loaded: true, error: null });
      return;
    }
    const days = parseDays(data.days);
    emit({
      program: days ? { name: data.name || 'My Program', days } : null,
      loaded: true,
      error: days ? null : 'Could not read that program.',
    });
  },
  clear() {
    generation++;
    emit({ program: null, loaded: false, error: null });
  },
};

export function useProgram() {
  return useSyncExternalStore(programStore.subscribe, programStore.get, programStore.get);
}

export async function saveProgram(program: Program) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error('Sign in to save your program.');
  const name = program.name.trim().slice(0, 40) || 'My Program';
  const days = program.days.map((day) =>
    day.rest || !day.type
      ? { rest: true }
      : {
          rest: false,
          type: day.type,
          focus: day.type === 'strength' ? day.focus : null,
          minutes: day.minutes,
          note: day.note.trim().slice(0, 40),
        }
  );
  const { error } = await supabase.from('training_programs').upsert({
    user_id: userId,
    name,
    days,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('That program did not save. Try again.');
  emit({ program: { name, days: days.map(asDay) }, loaded: true, error: null });
}
