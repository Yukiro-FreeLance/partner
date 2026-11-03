-- "Watched / visited together" entries surface in the partner's journal lists,
-- where the partner writes their own reflections.
alter table public.movie_entries
  add column if not exists watched_together boolean not null default false;

alter table public.visited_places
  add column if not exists visited_together boolean not null default false;

create table public.place_reflections (
  id text primary key,
  place_id text not null references public.visited_places(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  body text not null,
  image_urls text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'partner', 'public')),
  created_at text not null,
  updated_at text not null
);
create index place_reflections_place_date on public.place_reflections(place_id, created_at desc);

alter table public.place_reflections enable row level security;

grant select, insert, update, delete on public.place_reflections to authenticated;

create policy "journal owners manage place reflections" on public.place_reflections for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
