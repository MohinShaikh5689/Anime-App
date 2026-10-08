-- Manga and manhwa tracking: remember what kind of title each library entry is.
-- anime_id keeps its name; AniList ids are unique across anime and manga.

alter table public.library_entries
  add column if not exists media_type text not null default 'ANIME'
    check (media_type in ('ANIME', 'MANGA')),
  add column if not exists country text;

-- Make the new columns visible to the API right away.
notify pgrst, 'reload schema';
