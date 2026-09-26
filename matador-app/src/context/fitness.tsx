import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

import { useAuth } from '@/context/auth';
import {
  cacheKey,
  deleteWorkout,
  fetchWorkouts,
  importLegacyWorkouts,
  newWorkoutId,
  parseStoredWorkouts,
  saveWorkout,
  type Workout,
  type WorkoutSource,
  type WorkoutType,
} from '@/services/activity';

export type { Workout, WorkoutSource, WorkoutType };

type State = { loaded: boolean; workouts: Workout[] };

type Action =
  | { type: 'hydrate'; workouts: Workout[] }
  | { type: 'logWorkout'; entry: Workout }
  | { type: 'removeWorkout'; id: string };

export type LogWorkoutOptions = {
  source?: WorkoutSource;
  planId?: string | null;
  /** When the session happened. Defaults to now, and future times are clamped to now. */
  at?: number;
};

const DAY = 24 * 60 * 60 * 1000;

export const WORKOUT_TYPES: { key: WorkoutType; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', icon: 'barbell' },
  { key: 'run', label: 'Run', icon: 'walk' },
  { key: 'hiit', label: 'HIIT', icon: 'flash' },
  { key: 'cycle', label: 'Cycle', icon: 'bicycle' },
  { key: 'yoga', label: 'Mobility', icon: 'body' },
  { key: 'sport', label: 'Sport', icon: 'basketball' },
];

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { loaded: true, workouts: action.workouts };
    case 'logWorkout':
      return { ...state, workouts: [...state.workouts, action.entry] };
    case 'removeWorkout':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) };
  }
}

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type PendingAdd = { workout: Workout; source: WorkoutSource; planId: string | null };

type FitnessContext = State & {
  logWorkout: (type: WorkoutType, minutes: number, options?: LogWorkoutOptions) => void;
  removeWorkout: (id: string) => void;
  /** Minutes per day for the last 7 days, oldest first; the last item is today. */
  week: { day: number; minutes: number }[];
  weekMinutes: number;
  streak: number;
};

const Ctx = createContext<FitnessContext | null>(null);

export function FitnessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [state, dispatch] = useReducer(reducer, { loaded: false, workouts: [] });
  const userIdRef = useRef(userId);
  const pendingAdds = useRef(new Map<string, PendingAdd>());
  const pendingDeletes = useRef(new Set<string>());
  userIdRef.current = userId;

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    pendingAdds.current.clear();
    pendingDeletes.current.clear();

    if (!userId) {
      dispatch({ type: 'hydrate', workouts: [] });
      return;
    }

    const accountId = userId;
    (async () => {
      let showedCache = false;
      try {
        const cached = parseStoredWorkouts(await AsyncStorage.getItem(cacheKey(accountId)));
        if (cancelled) return;
        if (cached.length) {
          dispatch({ type: 'hydrate', workouts: cached });
          showedCache = true;
        }

        await importLegacyWorkouts(accountId);
        let remote = await fetchWorkouts();
        const remoteIds = new Set(remote.map((w) => w.id));
        const missing = cached.filter((w) => !remoteIds.has(w.id) && !pendingDeletes.current.has(w.id));
        for (const workout of missing) {
          await saveWorkout(accountId, workout, 'manual', null);
        }
        if (missing.length) remote = await fetchWorkouts();
        if (cancelled) return;

        const deleted = pendingDeletes.current;
        const extras = [...pendingAdds.current.values()]
          .map((p) => p.workout)
          .filter((w) => !deleted.has(w.id) && !remote.some((r) => r.id === w.id));
        dispatch({
          type: 'hydrate',
          workouts: [...remote.filter((w) => !deleted.has(w.id)), ...extras],
        });
      } catch {
        if (!cancelled && !showedCache) dispatch({ type: 'hydrate', workouts: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  useEffect(() => {
    if (!state.loaded || !userId) return;
    AsyncStorage.setItem(cacheKey(userId), JSON.stringify({ workouts: state.workouts })).catch(() => {});
  }, [state, userId]);

  const value = useMemo<FitnessContext>(() => {
    const today = startOfDay(Date.now());

    const week = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(today - (6 - i) * DAY + DAY / 2);
      const next = startOfDay(day + DAY + DAY / 2);
      const minutes = state.workouts
        .filter((w) => w.at >= day && w.at < next)
        .reduce((s, w) => s + w.minutes, 0);
      return { day, minutes };
    });

    const activeDays = new Set(state.workouts.map((w) => startOfDay(w.at)));
    let streak = 0;
    let cursor = activeDays.has(today) ? today : startOfDay(today - DAY / 2);
    while (activeDays.has(cursor)) {
      streak++;
      cursor = startOfDay(cursor - DAY / 2);
    }

    return {
      ...state,
      logWorkout: (type, minutes, options) => {
        const accountId = userIdRef.current;
        if (!accountId) return;
        const requested = options?.at;
        const at = requested != null && Number.isFinite(requested) ? Math.min(requested, Date.now()) : Date.now();
        const entry: Workout = { id: newWorkoutId(), type, minutes, at };
        const source = options?.source ?? 'manual';
        const planId = options?.planId ?? null;
        pendingAdds.current.set(entry.id, { workout: entry, source, planId });
        dispatch({ type: 'logWorkout', entry });
        saveWorkout(accountId, entry, source, planId)
          .then(() => pendingAdds.current.delete(entry.id))
          .catch(() => {});
      },
      removeWorkout: (id) => {
        pendingAdds.current.delete(id);
        pendingDeletes.current.add(id);
        dispatch({ type: 'removeWorkout', id });
        deleteWorkout(id)
          .then(() => pendingDeletes.current.delete(id))
          .catch(() => {});
      },
      week,
      weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
      streak,
    };
  }, [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFitness() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFitness must be used inside FitnessProvider');
  return ctx;
}
