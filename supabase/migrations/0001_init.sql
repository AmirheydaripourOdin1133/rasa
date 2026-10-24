-- رسا | RASA — initial schema (Supabase / PostgreSQL)
-- Design goals:
--   * every user-scoped table is owned by auth.users and protected by RLS
--   * medication strengths/concentrations use NUMERIC (no float drift)
--   * prescribed vs actual consumption are stored separately
--   * plan authorization, versions and audit history are first-class rows
--   * demo/synthetic rows are explicitly flagged (is_demo) and never mixed
--     with real-user data

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  personal_goal text,
  jurisdiction text not null default 'ir',
  emergency_contacts jsonb not null default '[]'::jsonb,
  onboarded_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------- medication_profiles --
create table if not exists public.medication_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_name text not null,
  ingredient_name text not null,
  formulation text not null check (formulation in ('tablet', 'liquid')),
  -- labeled strength (mg per tablet) — tablet formulation
  tablet_strength_mg numeric(12, 4) check (tablet_strength_mg is null or tablet_strength_mg > 0),
  -- labeled concentration (mg per mL) — liquid formulation
  concentration_mg_per_ml numeric(12, 4) check (concentration_mg_per_ml is null or concentration_mg_per_ml > 0),
  -- prescribed daily amount, expressed in the recording unit (tablet | mL)
  prescribed_daily_amount numeric(12, 4) check (prescribed_daily_amount is null or prescribed_daily_amount >= 0),
  administrations_per_day smallint not null default 1 check (administrations_per_day between 1 and 6),
  administration_times text[] not null default '{}',
  regimen_start_date date,
  duration_of_use_months numeric(8, 2),
  info_source text not null check (info_source in ('self-reported', 'imported-record', 'clinician-approved')),
  last_review_date date,
  next_review_date date,
  other_medications_note text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- formulation-specific completeness guard
  constraint medication_formulation_fields check (
    (formulation = 'tablet' and tablet_strength_mg is not null)
    or (formulation = 'liquid' and concentration_mg_per_ml is not null)
  )
);

-- ---------------------------------------------------------- treatment_plans --
create table if not exists public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null default 1 check (version >= 1),
  title text not null,
  status text not null check (
    status in ('draft', 'awaiting-review', 'active', 'review-required', 'paused', 'superseded', 'completed')
  ),
  source text not null check (source in ('clinician-approved', 'user-recorded', 'imported-record')),
  authorization text not null check (authorization in ('authorized', 'unauthorized', 'pending')),
  authorized_by text,
  authorized_at timestamptz,
  effective_date date,
  next_review_date date,
  goal text check (goal in ('reduce', 'maintain', 'stabilize-then-decide', 'other')),
  -- recorded milestones only; the app NEVER generates schedules
  milestones jsonb not null default '[]'::jsonb,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_authorized_requires_by check (authorization <> 'authorized' or authorized_by is not null)
);

create table if not exists public.plan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.treatment_plans (id) on delete cascade,
  type text not null check (
    type in ('created', 'updated', 'status-changed', 'authorized', 'review-recorded', 'superseded')
  ),
  from_status text,
  to_status text,
  summary text not null,
  at timestamptz not null default now()
);

-- --------------------------------------------------- daily_medication_logs --
-- `entries` holds per-administration rows:
--   [{ slotIndex, plannedTime, plannedAmount, status, actualTime, actualAmount, note }]
-- planned* = recorded plan (never computed), actual* = what the user consumed.
create table if not exists public.daily_medication_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ----------------------------------------------------- daily_symptom_logs --
create table if not exists public.daily_symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  sleep_quality smallint check (sleep_quality between 0 and 4),
  anxiety smallint check (anxiety between 0 and 4),
  craving smallint check (craving between 0 and 4),
  gi smallint check (gi between 0 and 4),
  sweating_chills smallint check (sweating_chills between 0 and 4),
  aches_restlessness smallint check (aches_restlessness between 0 and 4),
  mood smallint check (mood between 0 and 4),
  adherence_difficulty text check (adherence_difficulty in ('none', 'minor', 'major')),
  unsure text[] not null default '{}',
  other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- -------------------------------------------------------------- reminders --
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication boolean not null default false,
  medication_times text[] not null default '{}',
  checkin boolean not null default true,
  checkin_time time not null default '20:00',
  log_review boolean not null default true,
  log_review_time time not null default '21:30',
  review_lead_days smallint not null default 3 check (review_lead_days between 0 and 14),
  muted boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- ----------------------------------------------------------- safety_events --
create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('escalation-flag', 'guidance-shown', 'emergency-info-opened')
  ),
  at timestamptz not null default now(),
  detail text not null
);

-- ------------------------------------------------------------- audit_logs --
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- indexes --
create index if not exists idx_medication_profiles_user on public.medication_profiles (user_id);
create index if not exists idx_treatment_plans_user on public.treatment_plans (user_id, status);
create index if not exists idx_plan_events_plan on public.plan_events (plan_id, at desc);
create index if not exists idx_med_logs_user_date on public.daily_medication_logs (user_id, log_date desc);
create index if not exists idx_symptom_logs_user_date on public.daily_symptom_logs (user_id, log_date desc);
create index if not exists idx_safety_events_user on public.safety_events (user_id, at desc);
create index if not exists idx_audit_logs_user on public.audit_logs (user_id, at desc);

-- --------------------------------------------------------- updated_at hook --
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'medication_profiles', 'treatment_plans',
    'daily_medication_logs', 'daily_symptom_logs', 'reminders'
  ] loop
    execute format('drop trigger if exists set_updated_at_%I on public.%I', t, t);
    execute format(
      'create trigger set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------- Row Level Security --
-- Every exposed user table is owner-scoped. The app additionally verifies
-- ownership server-side; RLS is the last line of defence, not the only one.

alter table public.profiles enable row level security;
alter table public.medication_profiles enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.plan_events enable row level security;
alter table public.daily_medication_logs enable row level security;
alter table public.daily_symptom_logs enable row level security;
alter table public.reminders enable row level security;
alter table public.safety_events enable row level security;
alter table public.audit_logs enable row level security;

-- profiles (keyed by id, not user_id)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles for delete using (auth.uid() = id);

-- generic owner policies for the remaining tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'medication_profiles', 'treatment_plans', 'plan_events',
    'daily_medication_logs', 'daily_symptom_logs', 'reminders',
    'safety_events', 'audit_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end $$;

-- ------------------------------------------------------- profile bootstrap --
-- create a profile row automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.reminders (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
