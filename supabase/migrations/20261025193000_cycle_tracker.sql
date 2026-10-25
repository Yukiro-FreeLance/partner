-- Private menstrual, fertility, and intimacy records.
-- The Next.js server uses the service role and its own ownership checks.
-- Data API access is limited to the signed-in owner. Partners cannot read these tables.
-- Sharing is a separate grant the server consults before it builds a partner view.

create table public.cycle_profiles (
  user_id text primary key references public.profiles(id) on delete cascade,
  time_zone text not null default 'UTC',
  typical_cycle_length integer not null default 28 check (typical_cycle_length between 15 and 90),
  typical_period_length integer not null default 5 check (typical_period_length between 1 and 10),
  luteal_length integer not null default 14 check (luteal_length between 10 and 18),
  external_estimate_consent boolean not null default false,
  share_period_summary boolean not null default false,
  share_fertile_summary boolean not null default false,
  share_mood_summary boolean not null default false,
  share_symptom_summary boolean not null default false,
  share_intimacy_summary boolean not null default false,
  share_selected_details boolean not null default false,
  period_reminder boolean not null default false,
  period_lead_days integer not null default 2 check (period_lead_days between 0 and 14),
  check_in_reminder boolean not null default false,
  check_in_hour integer not null default 20 check (check_in_hour between 0 and 23),
  fertile_reminder boolean not null default false,
  pregnancy_test_reminder boolean not null default false,
  missed_check_in_reminder boolean not null default false,
  sample_data boolean not null default false,
  created_at text not null,
  updated_at text not null
);

create table public.cycle_periods (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  started_on text not null check (started_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  ended_on text check (ended_on is null or ended_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  note text,
  created_at text not null,
  updated_at text not null,
  unique (user_id, started_on)
);

create table public.cycle_check_ins (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  day text not null check (day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  symptoms jsonb not null default '[]'::jsonb,
  custom_symptoms jsonb not null default '[]'::jsonb,
  mood text,
  energy integer check (energy is null or energy between 1 and 5),
  sex_drive text,
  bleeding text,
  cervical_mucus text,
  sleep_quality integer check (sleep_quality is null or sleep_quality between 1 and 5),
  stress_level integer check (stress_level is null or stress_level between 1 and 5),
  wellness_note text,
  moment text,
  notes text,
  affection integer check (affection is null or affection between 1 and 5),
  emotional_closeness integer check (emotional_closeness is null or emotional_closeness between 1 and 5),
  intimacy_preference text,
  comfort integer check (comfort is null or comfort between 1 and 5),
  readiness integer check (readiness is null or readiness between 1 and 5),
  sexual_activity text,
  contraception text,
  share_level text not null default 'private' check (share_level in ('private', 'summary', 'selected')),
  shared_fields jsonb not null default '[]'::jsonb,
  created_at text not null,
  updated_at text not null,
  unique (user_id, day)
);

create table public.cycle_pregnancy_logs (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  tested_on text not null check (tested_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  result text not null check (result in ('positive', 'negative', 'invalid', 'not_taken')),
  notes text,
  created_at text not null,
  updated_at text not null
);

create table public.cycle_reminders (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('medication', 'custom')),
  title text not null,
  hour integer not null check (hour between 0 and 23),
  enabled boolean not null default true,
  next_run_on text,
  created_at text not null,
  updated_at text not null
);

create table public.cycle_events (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete set null,
  day text not null check (day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  title text not null,
  body text,
  visibility text not null default 'private' check (visibility in ('private', 'summary', 'selected', 'shared')),
  created_at text not null,
  updated_at text not null
);

create table public.cycle_share_grants (
  id text primary key,
  owner_id text not null references public.profiles(id) on delete cascade,
  partner_id text not null references public.profiles(id) on delete cascade,
  couple_id text not null references public.couples(id) on delete cascade,
  scope text not null check (scope in ('period_summary', 'fertile_summary', 'mood_summary', 'symptom_summary', 'intimacy_summary', 'selected_details')),
  granted_at text not null,
  revoked_at text
);

create index cycle_periods_user on public.cycle_periods (user_id, started_on);
create index cycle_check_ins_user on public.cycle_check_ins (user_id, day);
create index cycle_pregnancy_user on public.cycle_pregnancy_logs (user_id, tested_on);
create index cycle_events_user on public.cycle_events (user_id, day);
create index cycle_grants_owner on public.cycle_share_grants (owner_id, revoked_at);
create index cycle_grants_partner on public.cycle_share_grants (partner_id, revoked_at);

alter table public.cycle_profiles enable row level security;
alter table public.cycle_periods enable row level security;
alter table public.cycle_check_ins enable row level security;
alter table public.cycle_pregnancy_logs enable row level security;
alter table public.cycle_reminders enable row level security;
alter table public.cycle_events enable row level security;
alter table public.cycle_share_grants enable row level security;

create policy cycle_profiles_owner on public.cycle_profiles for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_periods_owner on public.cycle_periods for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_check_ins_owner on public.cycle_check_ins for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_pregnancy_owner on public.cycle_pregnancy_logs for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_reminders_owner on public.cycle_reminders for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_events_owner on public.cycle_events for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy cycle_grants_owner on public.cycle_share_grants for all to authenticated
  using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

create policy cycle_grants_partner_read on public.cycle_share_grants for select to authenticated
  using (partner_id = auth.uid()::text and revoked_at is null);

revoke all on table public.cycle_profiles, public.cycle_periods, public.cycle_check_ins, public.cycle_pregnancy_logs, public.cycle_reminders, public.cycle_events, public.cycle_share_grants from anon;
grant select, insert, update, delete on table public.cycle_profiles, public.cycle_periods, public.cycle_check_ins, public.cycle_pregnancy_logs, public.cycle_reminders, public.cycle_events, public.cycle_share_grants to authenticated;
