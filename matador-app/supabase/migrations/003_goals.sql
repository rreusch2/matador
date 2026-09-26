-- MATADOR - migration 003: training goals and private weigh-ins
-- Applied to the live project as well. Safe to re-run the table statements.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('sessions', 'weight', 'lift', 'event')),
  title text not null check (char_length(title) between 1 and 80),
  sessions_per_week smallint check (sessions_per_week between 1 and 7),
  start_weight numeric(6,1) check (start_weight is null or start_weight between 20 and 800),
  target_weight numeric(6,1) check (target_weight is null or target_weight between 20 and 800),
  weight_unit text check (weight_unit is null or weight_unit in ('lb', 'kg')),
  lift_name text check (lift_name is null or char_length(lift_name) between 1 and 60),
  target_reps smallint check (target_reps is null or target_reps between 1 and 200),
  target_load numeric(6,1) check (target_load is null or target_load between 0 and 1500),
  current_reps smallint check (current_reps is null or current_reps between 0 and 200),
  current_load numeric(6,1) check (current_load is null or current_load between 0 and 1500),
  load_unit text check (load_unit is null or load_unit in ('lb', 'kg')),
  target_date date,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint goals_sessions_shape check (kind <> 'sessions' or sessions_per_week is not null),
  constraint goals_weight_shape check (
    kind <> 'weight'
    or (start_weight is not null and target_weight is not null and weight_unit is not null and target_date is not null)
  ),
  constraint goals_lift_shape check (
    kind <> 'lift' or (lift_name is not null and target_reps is not null and target_date is not null)
  ),
  constraint goals_event_shape check (kind <> 'event' or target_date is not null)
);

create index if not exists goals_user_idx on public.goals (user_id, created_at desc);
create unique index if not exists goals_active_sessions_idx
  on public.goals (user_id)
  where kind = 'sessions' and archived_at is null;

create table if not exists public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  weight numeric(6,1) not null check (weight between 20 and 800),
  unit text not null check (unit in ('lb', 'kg')),
  weighed_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists weigh_ins_goal_idx on public.weigh_ins (goal_id, weighed_on desc);
