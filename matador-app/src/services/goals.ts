import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

export type GoalKind = 'sessions' | 'weight' | 'lift' | 'event';
export type WeightUnit = 'lb' | 'kg';

export type Goal = {
  id: string;
  kind: GoalKind;
  title: string;
  sessionsPerWeek: number | null;
  startWeight: number | null;
  targetWeight: number | null;
  weightUnit: WeightUnit | null;
  liftName: string | null;
  targetReps: number | null;
  targetLoad: number | null;
  currentReps: number | null;
  currentLoad: number | null;
  loadUnit: WeightUnit | null;
  targetDate: string | null;
  createdAt: string;
};

export type WeighIn = {
  id: string;
  goalId: string;
  weight: number;
  unit: WeightUnit;
  weighedOn: string;
  createdAt: string;
};

export type GoalFace = {
  kicker: string;
  title: string;
  stat: string;
  statUnit: string | null;
  hint: string;
  pct: number | null;
};

type GoalRow = {
  id: string;
  kind: string;
  title: string;
  sessions_per_week: number | null;
  start_weight: number | string | null;
  target_weight: number | string | null;
  weight_unit: string | null;
  lift_name: string | null;
  target_reps: number | null;
  target_load: number | string | null;
  current_reps: number | null;
  current_load: number | string | null;
  load_unit: string | null;
  target_date: string | null;
  created_at: string;
  weigh_ins?: WeighInRow[] | null;
};

type WeighInRow = {
  id: string;
  goal_id: string;
  weight: number | string;
  unit: string;
  weighed_on: string;
  created_at: string;
};

export type NewGoal = {
  kind: GoalKind;
  title: string;
  sessionsPerWeek?: number;
  startWeight?: number;
  targetWeight?: number;
  weightUnit?: WeightUnit;
  liftName?: string;
  targetReps?: number;
  targetLoad?: number | null;
  loadUnit?: WeightUnit;
  targetDate?: string;
};

const KINDS = new Set<GoalKind>(['sessions', 'weight', 'lift', 'event']);
const UNITS = new Set<WeightUnit>(['lb', 'kg']);

type Store = {
  goals: Goal[] | null;
  weighIns: WeighIn[];
  loading: boolean;
  error: string | null;
};

let state: Store = { goals: null, weighIns: [], loading: false, error: null };
let fetchedAt = 0;
let generation = 0;
const removed = new Set<string>();
const listeners = new Set<() => void>();

function emit(patch: Partial<Store>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function num(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function unit(value: string | null): WeightUnit | null {
  return value && UNITS.has(value as WeightUnit) ? (value as WeightUnit) : null;
}

function fromGoal(row: GoalRow): Goal | null {
  if (!KINDS.has(row.kind as GoalKind)) return null;
  return {
    id: row.id,
    kind: row.kind as GoalKind,
    title: row.title,
    sessionsPerWeek: row.sessions_per_week,
    startWeight: num(row.start_weight),
    targetWeight: num(row.target_weight),
    weightUnit: unit(row.weight_unit),
    liftName: row.lift_name,
    targetReps: row.target_reps,
    targetLoad: num(row.target_load),
    currentReps: row.current_reps,
    currentLoad: num(row.current_load),
    loadUnit: unit(row.load_unit),
    targetDate: row.target_date,
    createdAt: row.created_at,
  };
}

function fromWeighIn(row: WeighInRow): WeighIn | null {
  const weight = num(row.weight);
  const parsed = unit(row.unit);
  if (weight == null || !parsed) return null;
  return { id: row.id, goalId: row.goal_id, weight, unit: parsed, weighedOn: row.weighed_on, createdAt: row.created_at };
}

function friendly(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('goals_active_sessions') || error?.code === '23505') return 'You already have a days-a-week goal.';
  if (message.includes('network') || message.includes('fetch')) return "Can't reach the server. Check your connection.";
  return 'That goal did not save. Try again.';
}

async function accountId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

const GOAL_COLUMNS =
  'id, kind, title, sessions_per_week, start_weight, target_weight, weight_unit, lift_name, target_reps, target_load, current_reps, current_load, load_unit, target_date, created_at, weigh_ins(id, goal_id, weight, unit, weighed_on, created_at)';

export const goalStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  async refresh({ force = false } = {}) {
    if (state.loading) return;
    if (!force && state.goals && Date.now() - fetchedAt < 30_000) return;
    const gen = generation;
    emit({ loading: true, error: null });
    const { data, error } = await supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .is('archived_at', null)
      .order('created_at', { ascending: true });
    if (gen !== generation) return;
    if (error) {
      emit({ loading: false, error: friendly(error) });
      return;
    }
    const goals: Goal[] = [];
    const weighIns: WeighIn[] = [];
    for (const row of (data ?? []) as GoalRow[]) {
      if (removed.has(row.id)) continue;
      const goal = fromGoal(row);
      if (!goal) continue;
      goals.push(goal);
      for (const entry of row.weigh_ins ?? []) {
        const weighIn = fromWeighIn(entry);
        if (weighIn) weighIns.push(weighIn);
      }
    }
    fetchedAt = Date.now();
    emit({ goals, weighIns, loading: false, error: null });
  },
  clear() {
    generation++;
    fetchedAt = 0;
    removed.clear();
    emit({ goals: null, weighIns: [], loading: false, error: null });
  },
};

export function useGoals() {
  return useSyncExternalStore(goalStore.subscribe, goalStore.get, goalStore.get);
}

export function trimNum(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatDay(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date
    .toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

export function daysUntil(iso: string) {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function localDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function latestWeighIn(goal: Goal, weighIns: WeighIn[]) {
  return weighIns
    .filter((entry) => entry.goalId === goal.id)
    .sort((a, b) => a.weighedOn.localeCompare(b.weighedOn) || a.createdAt.localeCompare(b.createdAt))
    .at(-1);
}

export function faceGoal(goal: Goal, weighIns: WeighIn[], activeDays: number): GoalFace {
  if (goal.kind === 'sessions') {
    const total = goal.sessionsPerWeek ?? 4;
    const done = Math.min(activeDays, total);
    return {
      kicker: 'THIS WEEK',
      title: `TRAIN ${total} ${total === 1 ? 'DAY' : 'DAYS'}`,
      stat: `${done}/${total}`,
      statUnit: 'DAYS',
      hint:
        done >= total
          ? 'This week is covered.'
          : done === 0
            ? 'Log a workout and this fills in.'
            : `${total - done} more ${total - done === 1 ? 'day' : 'days'} this week.`,
      pct: total === 0 ? 0 : done / total,
    };
  }

  if (goal.kind === 'weight') {
    const unitLabel = (goal.weightUnit ?? 'lb').toUpperCase();
    const start = goal.startWeight ?? 0;
    const target = goal.targetWeight ?? start;
    const current = latestWeighIn(goal, weighIns)?.weight ?? start;
    const logged = weighIns.filter((entry) => entry.goalId === goal.id).length;
    const days = goal.targetDate ? daysUntil(goal.targetDate) : null;
    const losing = target < start - 0.05;
    const gaining = target > start + 0.05;
    let pct = Math.abs(current - target) <= 0.5 ? 1 : 0;
    if (losing || gaining) {
      const span = Math.abs(target - start);
      const moved = losing ? start - current : current - start;
      pct = span === 0 ? 0 : Math.min(1, Math.max(0, moved / span));
    }
    let hint = 'The next weigh-in draws the line.';
    if (days != null && days < 0) hint = 'That date has passed.';
    else if (!losing && !gaining) hint = `Hold ${trimNum(target)} ${unitLabel.toLowerCase()}.`;
    else if (logged >= 2 && days != null && days > 0) {
      const perWeek = Math.abs(target - current) / (days / 7);
      const pace = `${perWeek.toFixed(1)} ${unitLabel.toLowerCase()} a week from here`;
      const steep = losing && ((goal.weightUnit === 'kg' && perWeek > 0.9) || (goal.weightUnit !== 'kg' && perWeek > 2));
      hint = steep ? `${pace}. That date is aggressive.` : pace;
    }
    return {
      kicker: goal.targetDate ? `BY ${formatDay(goal.targetDate)}` : 'WEIGHT',
      title: `${trimNum(target)} ${unitLabel}`,
      stat: trimNum(current),
      statUnit: 'NOW',
      hint,
      pct,
    };
  }

  if (goal.kind === 'lift') {
    const unitLabel = goal.loadUnit ?? 'lb';
    const hasLoad = goal.targetLoad != null && goal.targetLoad > 0;
    const current = hasLoad ? goal.currentLoad : goal.currentReps;
    const target = hasLoad ? goal.targetLoad : goal.targetReps;
    const pct = current != null && target ? Math.min(1, Math.max(0, current / target)) : 0;
    const targetText = hasLoad
      ? `${trimNum(goal.targetLoad ?? 0)} ${unitLabel} \u00D7 ${goal.targetReps}`
      : `${goal.targetReps} reps`;
    return {
      kicker: goal.targetDate ? `BY ${formatDay(goal.targetDate)}` : 'LIFT',
      title: (goal.liftName ?? goal.title).toUpperCase(),
      stat: current == null ? '\u2014' : hasLoad ? trimNum(current) : String(current),
      statUnit: current == null ? null : hasLoad ? unitLabel.toUpperCase() : 'REPS',
      hint: current == null ? `Target ${targetText}. Add where you are.` : `Target ${targetText}.`,
      pct,
    };
  }

  const days = goal.targetDate ? daysUntil(goal.targetDate) : 0;
  return {
    kicker: goal.targetDate ? formatDay(goal.targetDate) : 'THE DATE',
    title: goal.title.toUpperCase(),
    stat: days < 0 ? '0' : String(days),
    statUnit: days === 1 ? 'DAY' : 'DAYS',
    hint: days < 0 ? 'That date has passed.' : days === 0 ? 'That is today.' : 'Days until the date.',
    pct: null,
  };
}

export async function createGoal(input: NewGoal) {
  const userId = await accountId();
  if (!userId) throw new Error('Sign in to set a goal.');
  const row = {
    user_id: userId,
    kind: input.kind,
    title: input.title.slice(0, 80),
    sessions_per_week: input.sessionsPerWeek ?? null,
    start_weight: input.startWeight ?? null,
    target_weight: input.targetWeight ?? null,
    weight_unit: input.weightUnit ?? null,
    lift_name: input.liftName ?? null,
    target_reps: input.targetReps ?? null,
    target_load: input.targetLoad ?? null,
    load_unit: input.loadUnit ?? null,
    target_date: input.targetDate ?? null,
  };
  const { data, error } = await supabase.from('goals').insert(row).select('id').single();
  if (error || !data) throw new Error(friendly(error));
  if (input.kind === 'weight' && input.startWeight != null && input.weightUnit) {
    const { error: weighError } = await supabase.from('weigh_ins').insert({
      user_id: userId,
      goal_id: data.id,
      weight: input.startWeight,
      unit: input.weightUnit,
      weighed_on: localDate(),
    });
    if (weighError) throw new Error(friendly(weighError));
  }
  fetchedAt = 0;
  await goalStore.refresh({ force: true });
}

export async function archiveGoal(id: string) {
  removed.add(id);
  emit({
    goals: (state.goals ?? []).filter((goal) => goal.id !== id),
    weighIns: state.weighIns.filter((entry) => entry.goalId !== id),
  });
  const { error } = await supabase.from('goals').update({ archived_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    removed.delete(id);
    fetchedAt = 0;
    await goalStore.refresh({ force: true });
    throw new Error(friendly(error));
  }
}

export async function logWeighIn(goalId: string, weight: number, unit: WeightUnit) {
  const userId = await accountId();
  if (!userId) throw new Error('Sign in to log a weigh-in.');
  const { error } = await supabase.from('weigh_ins').insert({
    user_id: userId,
    goal_id: goalId,
    weight,
    unit,
    weighed_on: localDate(),
  });
  if (error) throw new Error(friendly(error));
  fetchedAt = 0;
  await goalStore.refresh({ force: true });
}

export async function updateLiftProgress(id: string, currentReps: number | null, currentLoad: number | null) {
  const { error } = await supabase.from('goals').update({ current_reps: currentReps, current_load: currentLoad }).eq('id', id);
  if (error) throw new Error(friendly(error));
  emit({
    goals: (state.goals ?? []).map((goal) => (goal.id === id ? { ...goal, currentReps, currentLoad } : goal)),
  });
}
