alter table public.user_preferences
  add column if not exists show_game_stats boolean not null default false,
  add column if not exists show_game_achievements boolean not null default false,
  add column if not exists allow_game_challenges boolean not null default true,
  add column if not exists show_online_status boolean not null default true,
  add column if not exists show_activity_status boolean not null default true;

alter table public.notifications
  add column if not exists metadata jsonb;
