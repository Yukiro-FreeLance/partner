alter table public.profiles add column if not exists gender text;

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('female', 'male', 'unspecified'));

alter table public.cycle_profiles
  add column if not exists share_phase_summary boolean not null default false;

alter table public.cycle_share_grants drop constraint if exists cycle_share_grants_scope_check;
alter table public.cycle_share_grants
  add constraint cycle_share_grants_scope_check
  check (scope in (
    'phase_summary',
    'period_summary',
    'fertile_summary',
    'mood_summary',
    'symptom_summary',
    'intimacy_summary',
    'selected_details'
  ));
