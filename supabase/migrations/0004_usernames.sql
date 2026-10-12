-- Public @usernames: 3–20 characters, lowercase letters, numbers and underscores,
-- unique regardless of case. Optional until the user picks one.

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

-- Make the new column visible to the API right away.
notify pgrst, 'reload schema';
