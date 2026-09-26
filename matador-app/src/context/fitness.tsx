import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';

export type WorkoutType = 'strength' | 'run' | 'hiit' | 'cycle' | 'yoga' | 'sport';
export type Workout = { id: string; type: WorkoutType; minutes: number; at: number };

type State = { loaded: boolean; workouts: Workout[] };

type Action =
  | { type: 'hydrate'; workouts: Workout[] }
  | { type: 'logWorkout'; entry: Workout }
  | { type: 'removeWorkout'; id: string };

const STORAGE_KEY = 'matador.fitness.v1';
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

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

type FitnessContext = State & {
  logWorkout: (type: WorkoutType, minutes: number) => void;
  removeWorkout: (id: string) => void;
  /** Minutes per day for the last 7 days, oldest first; the last item is today. */
  week: { day: number; minutes: number }[];
  weekMinutes: number;
  streak: number;
};

const Ctx = createContext<FitnessContext | null>(null);

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { loaded: false, workouts: [] });
  const skipSave = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as { workouts?: Workout[] }) : {};
        dispatch({ type: 'hydrate', workouts: saved.workouts ?? [] });
      })
      .catch(() => dispatch({ type: 'hydrate', workouts: [] }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ workouts: state.workouts })).catch(() => {});
  }, [state]);

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
      logWorkout: (type, minutes) =>
        dispatch({ type: 'logWorkout', entry: { id: uid(), type, minutes, at: Date.now() } }),
      removeWorkout: (id) => dispatch({ type: 'removeWorkout', id }),
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
