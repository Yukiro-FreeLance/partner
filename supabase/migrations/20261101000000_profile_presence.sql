alter table public.profiles
  add column if not exists last_login_at text,
  add column if not exists last_seen_at text;
