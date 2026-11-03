alter table public.movie_entries
  add column if not exists content_type text not null default 'movie'
    check (content_type in ('movie', 'series', 'season', 'episode', 'other')),
  add column if not exists custom_type text,
  add column if not exists series_id text references public.movie_entries(id) on delete cascade,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists watched_with text,
  add column if not exists mood text,
  add column if not exists images text[] not null default '{}';
create index if not exists movie_entries_series on public.movie_entries(series_id);

alter table public.movie_reflections
  add column if not exists image_urls text[] not null default '{}';
