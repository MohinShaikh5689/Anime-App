-- =========================================================
-- Anime Tracker: initial schema
-- =========================================================

-- ---------- Profiles (one row per auth user) ----------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Library entries (the four lists) ----------
create type public.list_status as enum ('watching', 'wishlist', 'watched', 'dropped');

create table public.library_entries (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  anime_id      integer not null,                 -- AniList media id
  -- cached AniList metadata so lists render offline
  title         text not null,
  cover_url     text,
  cover_color   text,
  episodes      integer check (episodes is null or episodes >= 0),
  format        text,
  year          smallint,
  average_score smallint check (average_score between 0 and 100),
  -- user data
  status        public.list_status not null,
  progress      integer not null default 0 check (progress >= 0),
  rating        smallint check (rating between 1 and 5),
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),  -- set by the device; last write wins
  deleted_at    timestamptz,                         -- soft delete, so removals reach other devices
  synced_at     timestamptz not null default now(),  -- set by the server on every write
  primary key (user_id, anime_id)
);

create index library_entries_user_synced_idx
  on public.library_entries (user_id, synced_at);

alter table public.library_entries enable row level security;

create policy "Users can view their own entries"
  on public.library_entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own entries"
  on public.library_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own entries"
  on public.library_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own entries"
  on public.library_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Server-side timestamp, so a device can ask "what changed since I last synced?"
-- without trusting phone clocks.
create or replace function public.touch_synced_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

create trigger library_entries_touch_synced_at
  before insert or update on public.library_entries
  for each row execute function public.touch_synced_at();

-- Optional: live updates between your devices (Supabase Realtime)
alter publication supabase_realtime add table public.library_entries;
