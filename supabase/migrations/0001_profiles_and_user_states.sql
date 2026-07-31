-- MyTimeTracker — P1: profiles + user_states + RLS
--
-- Additive only. Creates two new tables, their RLS policies, and a trigger
-- that gives every newly registered auth user a default profile with a
-- 30-day trial. Does not touch any existing table in this project.
--
-- Safe to re-run: every object uses IF NOT EXISTS / OR REPLACE / DROP ... IF
-- EXISTS before CREATE, so re-running this script is idempotent.
--
-- How to run: Supabase Dashboard -> your project -> SQL Editor -> New query
-- -> paste this whole file -> Run.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  plan text not null default 'trial' check (plan in ('trial', 'pro')),
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'expired', 'blocked')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for regular users on purpose: profile rows are only
-- ever created by the handle_new_user() trigger below, so a signed-in user
-- can never grant themselves plan='pro' or a fake subscription_status by
-- calling the REST/JS client directly.

-- ---------------------------------------------------------------------------
-- user_states — the whole app state as one JSONB blob (entries/categories/
-- assistantTasks/preferences), one row per user. Mirrors the existing
-- localStorage "mytimetracker_state_v1" shape 1:1 for a low-risk first
-- migration; not normalized into relational tables yet, by design.
-- ---------------------------------------------------------------------------
create table if not exists public.user_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schema_version integer not null default 2,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

drop policy if exists "user_states_select_own" on public.user_states;
create policy "user_states_select_own"
  on public.user_states for select
  using (auth.uid() = user_id);

drop policy if exists "user_states_insert_own" on public.user_states;
create policy "user_states_insert_own"
  on public.user_states for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_states_update_own" on public.user_states;
create policy "user_states_update_own"
  on public.user_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_states_delete_own" on public.user_states;
create policy "user_states_delete_own"
  on public.user_states for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch, shared by both tables
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists set_updated_at_user_states on public.user_states;
create trigger set_updated_at_user_states
  before update on public.user_states
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> default profile row with a 30-day trial.
-- security definer + explicit search_path: needs to bypass RLS to insert on
-- the new user's behalf (there is no session/auth.uid() yet at insert time),
-- and the fixed search_path avoids the classic search_path-hijack risk that
-- comes with security definer functions.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan, subscription_status, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'trial',
    'trial',
    now() + interval '30 days'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
