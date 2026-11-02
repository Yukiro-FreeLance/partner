create table public.movie_entries (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  tmdb_id integer,
  title text not null,
  poster_url text,
  release_year integer,
  genre text[] not null default '{}',
  director text,
  duration_minutes integer,
  watched_date text,
  status text not null check (status in ('watched', 'watching', 'want_to_watch')),
  rating numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'partner', 'public')),
  created_at text not null,
  updated_at text not null,
  unique (user_id, tmdb_id)
);
create index movie_entries_user_date on public.movie_entries(user_id, watched_date desc);

create table public.movie_reflections (
  id text primary key,
  movie_id text not null references public.movie_entries(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null,
  learned text,
  memorable_scene text,
  favorite_character text,
  life_lesson text,
  interpretation text,
  visibility text not null default 'private' check (visibility in ('private', 'partner', 'public')),
  created_at text not null,
  updated_at text not null
);
create index movie_reflections_movie_date on public.movie_reflections(movie_id, created_at desc);

create table public.visited_places (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  photo_urls text[] not null default '{}',
  visited_on text,
  notes text,
  reflection text,
  rating numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  category text not null check (category in ('nature', 'restaurant', 'tourist_attraction', 'historical', 'other')),
  visibility text not null default 'private' check (visibility in ('private', 'partner', 'public')),
  created_at text not null,
  updated_at text not null,
  unique (user_id, name, visited_on)
);
create index visited_places_user_date on public.visited_places(user_id, visited_on desc);

alter table public.movie_entries enable row level security;
alter table public.movie_reflections enable row level security;
alter table public.visited_places enable row level security;

grant select, insert, update, delete on public.movie_entries, public.movie_reflections, public.visited_places to authenticated;

create policy "journal owners manage movies" on public.movie_entries for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "journal owners manage reflections" on public.movie_reflections for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "journal owners manage places" on public.visited_places for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
