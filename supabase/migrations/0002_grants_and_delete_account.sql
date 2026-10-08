-- =========================================================
-- Anime Tracker: table grants + self-service account deletion
-- Run after 0001_init.sql. Safe to run more than once.
-- =========================================================

-- Newer Supabase projects don't grant table access to API roles automatically.
-- Row level security still limits every user to their own rows.
grant select, insert, update, delete on public.library_entries to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Lets a signed-in user delete their own account (required by the App Store for apps
-- with sign-up). Deleting the auth user cascades to profiles and library_entries.
create or replace function public.delete_account()
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

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
