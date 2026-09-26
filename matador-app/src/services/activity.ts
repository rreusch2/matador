import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

export type WorkoutType = 'strength' | 'run' | 'hiit' | 'cycle' | 'yoga' | 'sport';
export type Workout = { id: string; type: WorkoutType; minutes: number; at: number };
export type WorkoutSource = 'manual' | 'timer' | 'plan';

const LEGACY_KEY = 'matador.fitness.v1';
const TYPES = new Set<WorkoutType>(['strength', 'run', 'hiit', 'cycle', 'yoga', 'sport']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const cacheKey = (userId: string) => `matador.fitness.v2.${userId}`;

type WorkoutRow = {
  id: string;
  type: string;
  minutes: number;
  performed_at: string;
};

export function newWorkoutId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 0x3) | 0x8).toString(16);
  });
}

export function isWorkoutType(value: string): value is WorkoutType {
  return TYPES.has(value as WorkoutType);
}

function clampMinutes(minutes: number) {
  return Math.min(600, Math.max(1, Math.round(minutes)));
}

function fromRow(row: WorkoutRow): Workout | null {
  if (!isWorkoutType(row.type)) return null;
  const at = Date.parse(row.performed_at);
  if (!Number.isFinite(at)) return null;
  return { id: row.id, type: row.type, minutes: row.minutes, at };
}

export function parseStoredWorkouts(raw: string | null): Workout[] {
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as { workouts?: Workout[] };
    return (saved.workouts ?? []).filter(
      (w) => w && typeof w.id === 'string' && isWorkoutType(w.type) && Number.isFinite(w.at) && w.minutes > 0,
    );
  } catch {
    return [];
  }
}

function fingerprint(w: Pick<Workout, 'type' | 'minutes' | 'at'>) {
  return `${w.type}|${clampMinutes(w.minutes)}|${new Date(w.at).toISOString()}`;
}

function toInsert(userId: string, workout: Workout, source: WorkoutSource, planId: string | null) {
  return {
    id: UUID_RE.test(workout.id) ? workout.id : newWorkoutId(),
    user_id: userId,
    type: workout.type,
    minutes: clampMinutes(workout.minutes),
    source,
    plan_id: planId && UUID_RE.test(planId) ? planId : null,
    performed_at: new Date(workout.at).toISOString(),
  };
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, type, minutes, performed_at')
    .order('performed_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return ((data ?? []) as WorkoutRow[]).flatMap((row) => {
    const workout = fromRow(row);
    return workout ? [workout] : [];
  });
}

export async function saveWorkout(
  userId: string,
  workout: Workout,
  source: WorkoutSource,
  planId: string | null,
) {
  const row = toInsert(userId, workout, source, planId);
  let { error } = await supabase.from('workouts').upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  if (error && row.plan_id) {
    ({ error } = await supabase
      .from('workouts')
      .upsert({ ...row, plan_id: null }, { onConflict: 'id', ignoreDuplicates: true }));
  }
  if (error) throw error;
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from('workouts').delete().eq('id', id);
  if (error) throw error;
}

/** One-time upload of workouts that only lived on this phone, then drop that local copy. */
export async function importLegacyWorkouts(userId: string) {
  const flag = `matador.fitness.migrated.${userId}`;
  if (await AsyncStorage.getItem(flag)) return;

  const local = parseStoredWorkouts(await AsyncStorage.getItem(LEGACY_KEY));
  if (local.length) {
    const remote = await fetchWorkouts();
    const seen = new Set(remote.map(fingerprint));
    const fresh = local.filter((w) => !seen.has(fingerprint(w)));
    if (fresh.length) {
      const rows = fresh.map((w) => toInsert(userId, { ...w, id: newWorkoutId() }, 'manual', null));
      const { error } = await supabase.from('workouts').insert(rows);
      if (error) throw error;
    }
  }

  await AsyncStorage.setItem(flag, '1');
  await AsyncStorage.removeItem(LEGACY_KEY);
}
