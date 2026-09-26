import type { WorkoutType } from '@/context/fitness';
import { ApiError, api } from '@/lib/api';

export type Goal = 'muscle' | 'fat' | 'endurance' | 'mobility';
export type Focus = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'core';
export type Equipment = 'gym' | 'dumbbells' | 'bodyweight' | 'bands';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Intensity = 'low' | 'moderate' | 'high';

export type WorkoutPrefs = {
  goal: Goal;
  focus: Focus;
  minutes: 15 | 30 | 45 | 60;
  equipment: Equipment;
  level: Level;
};

export type Move = {
  name: string;
  /** null for flows done once (warm-up / cool-down). */
  sets: number | null;
  /** "8-10", "30s", "10/side"... */
  reps: string;
  rest: string | null;
  cue: string;
};

export type WorkoutPlan = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  intensity: Intensity;
  coachNote: string;
  minutes: number;
  prefs: WorkoutPrefs;
  notes: string | null;
  warmup: Move[];
  main: Move[];
  finisher: Move[];
  cooldown: Move[];
  logAs: WorkoutType;
  completedAt: string | null;
};

export const GOAL_OPTIONS: { key: Goal; label: string; icon: string }[] = [
  { key: 'muscle', label: 'Build Muscle', icon: 'barbell' },
  { key: 'fat', label: 'Burn Fat', icon: 'flame' },
  { key: 'endurance', label: 'Endurance', icon: 'pulse' },
  { key: 'mobility', label: 'Mobility', icon: 'body' },
];

export const FOCUS_OPTIONS: { key: Focus; label: string }[] = [
  { key: 'full', label: 'Full Body' },
  { key: 'upper', label: 'Upper' },
  { key: 'lower', label: 'Lower' },
  { key: 'push', label: 'Push' },
  { key: 'pull', label: 'Pull' },
  { key: 'core', label: 'Core' },
];

export const EQUIPMENT_OPTIONS: { key: Equipment; label: string; icon: string }[] = [
  { key: 'gym', label: 'Full Gym', icon: 'business' },
  { key: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline' },
  { key: 'bodyweight', label: 'Bodyweight', icon: 'body-outline' },
  { key: 'bands', label: 'Bands', icon: 'git-commit-outline' },
];

export const LEVEL_OPTIONS: { key: Level; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

export const TIME_OPTIONS = [15, 30, 45, 60] as const;

export const NOTES_MAX = 200;

export { ApiError as WorkoutError };

type GenerateOptions = {
  /** Injuries, preferences, limits. */
  notes?: string;
  /** Main exercises from the previous version, so a new version is genuinely different. */
  avoid?: string[];
};

export async function generateWorkout(prefs: WorkoutPrefs, opts: GenerateOptions = {}): Promise<WorkoutPlan> {
  const { plan } = await api<{ plan: WorkoutPlan }>('/v1/workouts/generate', {
    method: 'POST',
    body: { ...prefs, notes: opts.notes?.trim() || undefined, avoid: opts.avoid?.length ? opts.avoid : undefined },
  });
  return plan;
}

export async function listPlans(limit = 20): Promise<WorkoutPlan[]> {
  const { plans } = await api<{ plans: WorkoutPlan[] }>(`/v1/workouts/plans?limit=${limit}`);
  return plans;
}

/** Marks a saved plan as completed. Best effort; the local log drives streaks. */
export async function markPlanCompleted(planId: string) {
  await api(`/v1/workouts/plans/${planId}/complete`, { method: 'POST' }).catch(() => {});
}

/** Hands the latest plan from the builder card to the plan screen. */
let latest: WorkoutPlan | null = null;
export const planStore = {
  get: () => latest,
  set: (plan: WorkoutPlan) => {
    latest = plan;
  },
};
