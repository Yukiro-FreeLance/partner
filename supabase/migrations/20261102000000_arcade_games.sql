alter table public.user_preferences
  add column if not exists show_on_game_leaderboard boolean not null default false;

create table public.game_scores (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete set null,
  game_slug text not null,
  mode text not null check (mode in ('solo', 'partner')),
  kind text not null check (kind in ('solo', 'challenge', 'hotseat')),
  score integer not null check (score >= 0),
  match_id text,
  created_at text not null
);

create table public.game_matches (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  game_slug text not null,
  kind text not null check (kind in ('challenge', 'hotseat')),
  host_id text not null references public.profiles(id),
  guest_id text not null references public.profiles(id),
  host_score integer,
  guest_score integer,
  status text not null check (status in ('open', 'complete')),
  created_at text not null,
  updated_at text not null
);

create index game_scores_user on public.game_scores (user_id, game_slug, score desc);
create index game_scores_slug on public.game_scores (game_slug, score desc);
create index game_matches_couple on public.game_matches (couple_id, status, updated_at desc);

alter table public.game_scores enable row level security;
alter table public.game_matches enable row level security;

create policy game_scores_own on public.game_scores for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy game_scores_public_best on public.game_scores for select to authenticated
  using (
    exists (
      select 1 from public.user_preferences p
      where p.user_id = game_scores.user_id
        and p.show_on_game_leaderboard = true
    )
  );

create policy game_matches_member on public.game_matches for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

revoke all on table public.game_scores, public.game_matches from anon;
grant select, insert, update, delete on table public.game_scores, public.game_matches to authenticated;
