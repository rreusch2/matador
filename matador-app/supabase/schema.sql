-- =====================================================================
-- MATADOR - database schema v1
-- Paste into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: every statement is idempotent.
--
--   Accounts   profiles (1:1 with auth.users), addresses, push_tokens
--   Commerce   products, product_variants, favorites, cart_items,
--              orders, order_items, product_reviews
--   Training   workouts, workout_plans
--
-- Every table has Row Level Security on. Users can only ever see and
-- change their own rows. The catalog is public read-only. Orders are
-- read-only from the app; they get written server-side (service role)
-- once checkout/payments are wired up.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.product_category as enum ('energy', 'hydration', 'merch');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('pending', 'paid', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_type as enum ('strength', 'run', 'hiit', 'cycle', 'yoga', 'sport');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.workout_source as enum ('manual', 'timer', 'plan');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =====================================================================
-- ACCOUNTS
-- =====================================================================

-- One row per auth user, created automatically on sign up.
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  first_name       text check (char_length(first_name) <= 60),
  last_name        text check (char_length(last_name) <= 60),
  avatar_url       text,
  phone            text,
  birthdate        date,
  marketing_opt_in boolean not null default false,
  -- Last Workout Builder selections: { goal, focus, minutes, equipment, level }
  workout_prefs    jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Copies sign-up metadata (first_name, marketing_opt_in) into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, marketing_opt_in)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();


create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,                      -- "Home", "Gym"...
  full_name   text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  region      text not null,             -- state / province
  postal_code text not null,
  country     text not null default 'US',
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id);
-- At most one default address per user.
create unique index if not exists addresses_one_default
  on public.addresses (user_id) where is_default;

drop trigger if exists addresses_updated_at on public.addresses;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();


-- Expo push tokens for drop alerts / order updates.
create table if not exists public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  token        text not null unique,
  platform     text check (platform in ('ios', 'android', 'web')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);


-- =====================================================================
-- COMMERCE
-- =====================================================================

-- Mirrors src/data/products.ts. The id is the app's slug.
create table if not exists public.products (
  id           text primary key,
  name         text not null,
  flavor       text,
  category     public.product_category not null,
  price_cents  integer not null check (price_cents >= 0),
  tagline      text,
  description  text,
  badge        text,
  gradient     text[] not null default '{}',   -- two hex stops for the product art
  dark_ink     boolean not null default false,
  stats        jsonb not null default '[]'::jsonb,  -- [{ label, value }]
  ingredients  text[] not null default '{}',
  merch_kind   text check (merch_kind in ('tee', 'hat', 'shaker')),
  rating       numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category, sort_order);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();


-- Packs (6 / 12 / 24, 10 / 20 / 30 ct) and sizes (S-XXL). Each has its own price + stock.
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products (id) on delete cascade,
  kind        text not null check (kind in ('pack', 'size')),
  label       text not null,
  unit_count  integer,                       -- shots / sticks in a pack
  price_cents integer not null check (price_cents >= 0),
  sku         text unique,
  inventory   integer,                       -- null = untracked
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  unique (product_id, label)
);


create table if not exists public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);


-- Server-side cart so it follows the user across devices.
-- variant_label matches the app's cart key ('' when the product has no options).
create table if not exists public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  product_id    text not null references public.products (id) on delete cascade,
  variant_label text not null default '',
  quantity      integer not null check (quantity between 1 and 99),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, product_id, variant_label)
);

drop trigger if exists cart_items_updated_at on public.cart_items;
create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();


create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     bigint generated always as identity (start with 1001) unique,
  user_id          uuid references auth.users (id) on delete set null,
  email            text not null,
  status           public.order_status not null default 'pending',
  subtotal_cents   integer not null check (subtotal_cents >= 0),
  shipping_cents   integer not null default 0 check (shipping_cents >= 0),
  tax_cents        integer not null default 0 check (tax_cents >= 0),
  discount_cents   integer not null default 0 check (discount_cents >= 0),
  total_cents      integer not null check (total_cents >= 0),
  currency         text not null default 'usd',
  shipping_address jsonb,                    -- snapshot at purchase time
  payment_provider text,                     -- 'stripe', 'shopify'...
  payment_ref      text unique,              -- payment intent / checkout id
  tracking_number  text,
  placed_at        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id, placed_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();


-- Names and prices are snapshotted so old orders never change.
create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       text references public.products (id) on delete set null,
  variant_label    text not null default '',
  product_name     text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity         integer not null check (quantity > 0),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored
);

create index if not exists order_items_order_idx on public.order_items (order_id);


create table if not exists public.product_reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  title      text check (char_length(title) <= 80),
  body       text check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx on public.product_reviews (product_id, created_at desc);

drop trigger if exists product_reviews_updated_at on public.product_reviews;
create trigger product_reviews_updated_at before update on public.product_reviews
  for each row execute function public.set_updated_at();


-- =====================================================================
-- TRAINING
-- =====================================================================

-- Sessions from the Workout Builder. `plan` holds the full generated plan
-- (warmup / main / finisher / cooldown / coachNote) exactly as the app renders it.
create table if not exists public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  minutes      integer not null check (minutes between 5 and 180),
  prefs        jsonb not null,
  plan         jsonb not null,
  is_saved     boolean not null default false,
  completed_at timestamptz,
  model        text,
  latency_ms   integer,
  created_at   timestamptz not null default now()
);

alter table public.workout_plans
  add column if not exists model      text,
  add column if not exists latency_ms integer;

create index if not exists workout_plans_user_idx on public.workout_plans (user_id, created_at desc);


-- The workout log that powers streaks, weekly bars and hours trained.
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         public.workout_type not null,
  minutes      integer not null check (minutes between 1 and 600),
  source       public.workout_source not null default 'manual',
  plan_id      uuid references public.workout_plans (id) on delete set null,
  notes        text check (char_length(notes) <= 500),
  performed_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists workouts_user_idx on public.workouts (user_id, performed_at desc);


-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.addresses        enable row level security;
alter table public.push_tokens      enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.favorites        enable row level security;
alter table public.cart_items       enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.product_reviews  enable row level security;
alter table public.workout_plans    enable row level security;
alter table public.workouts         enable row level security;

-- Profiles: read + update your own (rows are created by the trigger).
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Catalog: anyone can read active products.
drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select to anon, authenticated using (is_active);

drop policy if exists "variants: public read" on public.product_variants;
create policy "variants: public read" on public.product_variants
  for select to anon, authenticated using (is_active);

-- Reviews: public read, write your own.
drop policy if exists "reviews: public read" on public.product_reviews;
create policy "reviews: public read" on public.product_reviews
  for select to anon, authenticated using (true);

drop policy if exists "reviews: write own" on public.product_reviews;
create policy "reviews: write own" on public.product_reviews
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Orders: read-only for the owner. Inserts/updates come from the server.
drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "order items: read own" on public.order_items;
create policy "order items: read own" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.uid())
  ));

-- Everything else: full control over your own rows.
do $$
declare t text;
begin
  foreach t in array array['addresses', 'push_tokens', 'favorites', 'cart_items', 'workout_plans', 'workouts']
  loop
    execute format('drop policy if exists "%1$s: own rows" on public.%1$I', t);
    execute format(
      'create policy "%1$s: own rows" on public.%1$I for all to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- API grants (RLS above still decides which rows are visible)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants, public.product_reviews to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant select, insert, update, delete on
  public.addresses, public.push_tokens, public.favorites, public.cart_items,
  public.product_reviews, public.workout_plans, public.workouts
  to authenticated;


-- ---------------------------------------------------------------------
-- In-app account deletion (required by the App Store)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ---------------------------------------------------------------------
-- Avatar storage: public bucket, users write only inside <their uid>/
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- =====================================================================
-- SEED: catalog (matches src/data/products.ts)
-- =====================================================================
insert into public.products
  (id, name, flavor, category, price_cents, tagline, description, badge, gradient, dark_ink,
   stats, ingredients, merch_kind, rating, review_count, sort_order)
values
  ('original-charge', 'Original Charge', 'Citrus Gold', 'energy', 1799,
   'The one that started the stampede.',
   'Our signature 2oz energy shot. Clean caffeine, B-vitamins and zero sugar to fuel whatever arena you step into - no jitters, no crash.',
   'BEST SELLER', '{"#FFE94D","#FEDB00"}', true,
   '[{"label":"CAFFEINE","value":"200MG"},{"label":"SUGAR","value":"0G"},{"label":"CALORIES","value":"10"}]',
   '{"Natural Caffeine","Vitamin B12","Vitamin B6","L-Theanine","Taurine"}', null, 4.9, 2140, 10),

  ('blue-raze', 'Blue Raze', 'Blue Raspberry', 'energy', 1799,
   'Ice-cold focus. Zero fade.',
   'Blue raspberry flavor with the same clean 200mg charge. Built for early lifts, late study sessions and everything in between.',
   null, '{"#2FA4FF","#0077C8"}', false,
   '[{"label":"CAFFEINE","value":"200MG"},{"label":"SUGAR","value":"0G"},{"label":"CALORIES","value":"10"}]',
   '{"Natural Caffeine","Vitamin B12","Vitamin B6","L-Theanine","Taurine"}', null, 4.8, 1312, 20),

  ('red-cape', 'Red Cape', 'Wild Cherry', 'energy', 1799,
   'Wave it. Watch them charge.',
   'Bold wild cherry flavor inspired by the matador''s cape. Clean energy that hits fast and lasts for hours.',
   'NEW', '{"#FF5A66","#EF3340"}', false,
   '[{"label":"CAFFEINE","value":"200MG"},{"label":"SUGAR","value":"0G"},{"label":"CALORIES","value":"10"}]',
   '{"Natural Caffeine","Vitamin B12","Vitamin B6","L-Theanine","Taurine"}', null, 4.8, 604, 30),

  ('black-horn', 'Black Horn', 'Midnight Grape', 'energy', 1999,
   'Extra strength for the final round.',
   'Our strongest shot: 300mg of clean caffeine with a dark grape finish. For when the stakes are highest.',
   'EXTRA', '{"#3A3A3A","#0D0D0D"}', false,
   '[{"label":"CAFFEINE","value":"300MG"},{"label":"SUGAR","value":"0G"},{"label":"CALORIES","value":"10"}]',
   '{"Natural Caffeine","Vitamin B12","Alpha-GPC","L-Theanine","Taurine"}', null, 4.9, 877, 40),

  ('lemon-lime-hydrate', 'Lemon Lime', 'Hydration Stick', 'hydration', 2499,
   'Rehydrate like a champion.',
   'Single-serve electrolyte sticks. Tear, pour, shake - 5x the electrolytes of a sports drink with only 1g of sugar.',
   'BEST SELLER', '{"#E4FF5C","#9BE22D"}', true,
   '[{"label":"ELECTROLYTES","value":"5X"},{"label":"SUGAR","value":"1G"},{"label":"VITAMIN C","value":"100%"}]',
   '{"Sodium","Potassium","Magnesium","Vitamin C","Zinc"}', null, 4.9, 1588, 50),

  ('tropical-storm', 'Tropical Storm', 'Hydration Stick', 'hydration', 2499,
   'A downpour of electrolytes.',
   'Mango-pineapple electrolyte sticks for training days, travel days and the morning after.',
   null, '{"#FFB23F","#FF7A00"}', true,
   '[{"label":"ELECTROLYTES","value":"5X"},{"label":"SUGAR","value":"1G"},{"label":"VITAMIN C","value":"100%"}]',
   '{"Sodium","Potassium","Magnesium","Vitamin C","Zinc"}', null, 4.7, 932, 60),

  ('berry-blitz', 'Berry Blitz', 'Hydration Stick', 'hydration', 2499,
   'Mixed berry. Maximum recovery.',
   'Mixed berry electrolyte sticks designed to replace what you sweat out - fast.',
   null, '{"#C150FF","#7B2FF7"}', false,
   '[{"label":"ELECTROLYTES","value":"5X"},{"label":"SUGAR","value":"1G"},{"label":"VITAMIN C","value":"100%"}]',
   '{"Sodium","Potassium","Magnesium","Vitamin C","Zinc"}', null, 4.8, 741, 70),

  ('watermelon-wave', 'Watermelon Wave', 'Hydration Stick', 'hydration', 2499,
   'Summer in a stick.',
   'Juicy watermelon electrolyte sticks. Light, crisp, and ridiculously refreshing.',
   'NEW', '{"#FF7C9C","#FF3D6E"}', false,
   '[{"label":"ELECTROLYTES","value":"5X"},{"label":"SUGAR","value":"1G"},{"label":"VITAMIN C","value":"100%"}]',
   '{"Sodium","Potassium","Magnesium","Vitamin C","Zinc"}', null, 4.8, 388, 80),

  ('horns-tee', 'Horns Tee', 'Heavyweight Cotton', 'merch', 3400,
   'Wear the horns.',
   'Oversized heavyweight tee with the Matador mark on the chest. Garment-dyed for that broken-in feel from day one.',
   'DROP 01', '{"#2A2A2A","#0A0A0A"}', false,
   '[{"label":"WEIGHT","value":"280GSM"},{"label":"FIT","value":"BOXY"},{"label":"COTTON","value":"100%"}]',
   '{}', 'tee', 4.9, 312, 90),

  ('gold-horns-tee', 'Gold Horns Tee', 'Arena Gold', 'merch', 3600,
   'Step into the arena.',
   'Our PMS 108 gold colorway with a black Matador mark on the chest and slanted wordmark on the back.',
   'DROP 01', '{"#FFF4A3","#FEDB00"}', true,
   '[{"label":"WEIGHT","value":"280GSM"},{"label":"FIT","value":"BOXY"},{"label":"COTTON","value":"100%"}]',
   '{}', 'tee', 4.8, 144, 100),

  ('charge-cap', 'Charge Cap', 'Structured Snapback', 'merch', 3200,
   'Horns up.',
   'Structured six-panel snapback with an embroidered yellow Matador mark.',
   null, '{"#2A2A2A","#0A0A0A"}', false,
   '[{"label":"PANELS","value":"6"},{"label":"FIT","value":"SNAP"},{"label":"MARK","value":"3D"}]',
   '{}', 'hat', 4.7, 201, 110),

  ('matador-shaker', 'Arena Shaker', '24oz Bottle', 'merch', 2200,
   'Mix your hydration anywhere.',
   'Leak-proof 24oz shaker built for Matador hydration sticks. Dishwasher safe, BPA free.',
   null, '{"#F5F5F5","#CFCFCF"}', true,
   '[{"label":"SIZE","value":"24OZ"},{"label":"BPA","value":"FREE"},{"label":"LEAKS","value":"0"}]',
   '{}', 'shaker', 4.8, 96, 120)
on conflict (id) do update set
  name = excluded.name, flavor = excluded.flavor, category = excluded.category,
  price_cents = excluded.price_cents, tagline = excluded.tagline, description = excluded.description,
  badge = excluded.badge, gradient = excluded.gradient, dark_ink = excluded.dark_ink,
  stats = excluded.stats, ingredients = excluded.ingredients, merch_kind = excluded.merch_kind,
  rating = excluded.rating, review_count = excluded.review_count, sort_order = excluded.sort_order;


-- Pack variants: price = base price x multiplier (same math as the app).
insert into public.product_variants (product_id, kind, label, unit_count, price_cents, sku, sort_order)
select p.id, 'pack', v.label, v.unit_count, round(p.price_cents * v.multiplier)::int,
       upper(p.id) || '-' || v.unit_count, v.sort_order
from public.products p
join (values
  ('energy',    '6 PACK',  6,  1.00, 1),
  ('energy',    '12 PACK', 12, 1.85, 2),
  ('energy',    '24 PACK', 24, 3.40, 3),
  ('hydration', '10 CT',   10, 1.00, 1),
  ('hydration', '20 CT',   20, 1.80, 2),
  ('hydration', '30 CT',   30, 2.50, 3)
) as v (category, label, unit_count, multiplier, sort_order)
  on p.category::text = v.category
on conflict (product_id, label) do update set
  unit_count = excluded.unit_count, price_cents = excluded.price_cents, sort_order = excluded.sort_order;

-- Size variants (merch): same price as the product.
insert into public.product_variants (product_id, kind, label, price_cents, sku, sort_order)
select p.id, 'size', s.label, p.price_cents,
       upper(p.id) || '-' || replace(s.label, ' ', ''), s.sort_order
from public.products p
join (values
  ('tee',    'S',        1),
  ('tee',    'M',        2),
  ('tee',    'L',        3),
  ('tee',    'XL',       4),
  ('tee',    'XXL',      5),
  ('hat',    'ONE SIZE', 1),
  ('shaker', '24 OZ',    1)
) as s (merch_kind, label, sort_order)
  on p.merch_kind = s.merch_kind
on conflict (product_id, label) do update set
  price_cents = excluded.price_cents, sort_order = excluded.sort_order;
