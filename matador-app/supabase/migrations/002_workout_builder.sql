-- MATADOR - migration 002: Workout Builder generation metadata
-- Run once in Supabase > SQL Editor (safe to re-run).

alter table public.workout_plans
  add column if not exists model      text,
  add column if not exists latency_ms integer;
