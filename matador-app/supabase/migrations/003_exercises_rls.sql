-- Catalog is public-read. Clients cannot write.
alter table public.exercises enable row level security;

drop policy if exists "exercises: public read" on public.exercises;
create policy "exercises: public read" on public.exercises
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.exercises from anon, authenticated;
grant select on public.exercises to anon, authenticated;

create index if not exists exercises_app_equipment_idx on public.exercises (app_equipment);
create index if not exists exercises_app_level_idx on public.exercises (app_level);
create index if not exists exercises_body_region_idx on public.exercises (body_region);
create index if not exists exercises_force_type_idx on public.exercises (force_type);
