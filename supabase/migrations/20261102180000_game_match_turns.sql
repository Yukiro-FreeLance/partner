alter table public.game_matches
  add column if not exists turn_seat text not null default 'host' check (turn_seat in ('host', 'guest')),
  add column if not exists revision integer not null default 0,
  add column if not exists turns jsonb not null default '[]'::jsonb,
  add column if not exists snapshot jsonb not null default '{"note":null,"score":null,"board":null}'::jsonb;
