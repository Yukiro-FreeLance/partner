-- CoupleSync schema, constraints, and row level security.
-- Identifiers are text so system questions can keep stable slugs.
-- Timestamps are ISO-8601 text written by the application.
-- The Next.js server uses the service role after its own membership checks.
-- The service role bypasses RLS. These policies protect the Data API.
-- Admins can review reports and the question catalog. They cannot read private answers, notes, memories, or personality results.

create or replace function public.is_couple_member(target_couple text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target_couple
      and user_id = auth.uid()::text
      and status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'admin'
  );
$$;

create or replace function public.answer_revealed_to_me(owner text, question text, couple text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.answer_reveals
    where owner_id = owner
      and question_id = question
      and couple_id = couple
      and viewer_id = auth.uid()::text
  );
$$;

create or replace function public.question_is_visible(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.questions q
    where q.id = target
      and q.is_active
      and (
        (q.visibility = 'public' and q.couple_id is null)
        or q.created_by = auth.uid()::text
        or (q.visibility = 'couple' and public.is_couple_member(q.couple_id))
      )
  );
$$;

create or replace function public.enforce_couple_membership()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' then
    if exists (
      select 1 from public.couple_members
      where user_id = new.user_id and status = 'active' and id <> new.id
    ) then
      raise exception 'A person can belong to only one active couple';
    end if;
    if (
      select count(*) from public.couple_members
      where couple_id = new.couple_id and status = 'active' and id <> new.id
    ) >= 2 then
      raise exception 'A couple can have only two active partners';
    end if;
  end if;
  return new;
end;
$$;

create table public.profiles (
  id text primary key,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  relationship_status text,
  relationship_started_on text,
  interests text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  role text not null default 'user' check (role in ('user', 'admin')),
  is_demo boolean not null default false,
  email_verified boolean not null default false,
  created_at text not null,
  updated_at text not null
);

create table public.credentials (
  user_id text primary key references public.profiles(id) on delete cascade,
  password_hash text not null
);

create table public.email_tokens (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('verify', 'reset')),
  token_hash text not null,
  expires_at text not null,
  used_at text,
  created_at text not null
);

create table public.couples (
  id text primary key,
  name text not null,
  nickname text,
  created_by text not null references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'archived')),
  relationship_started_on text,
  created_at text not null,
  updated_at text not null
);

create table public.couple_members (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('active', 'left')),
  joined_at text not null,
  left_at text
);

create unique index couple_members_one_active_user on public.couple_members (user_id) where status = 'active';
create index couple_members_couple_status on public.couple_members (couple_id, status);
create trigger couple_members_limit before insert or update on public.couple_members
  for each row execute function public.enforce_couple_membership();

create table public.couple_invitations (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  code text not null unique,
  token text not null unique,
  created_by text not null references public.profiles(id),
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at text not null,
  accepted_by text references public.profiles(id),
  accepted_at text,
  created_at text not null
);
create index couple_invitations_couple on public.couple_invitations (couple_id, status);

create table public.reconnect_requests (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  requester_id text not null references public.profiles(id),
  partner_id text not null references public.profiles(id),
  status text not null check (status in ('pending', 'approved', 'declined', 'cancelled')),
  created_at text not null,
  resolved_at text
);

create table public.question_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  sensitive boolean not null default false
);

create table public.questions (
  id text primary key,
  category_id text not null references public.question_categories(id),
  slug text not null unique,
  self_prompt text not null,
  guess_prompt text not null,
  reverse_prompt text not null,
  answer_type text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'deep')),
  sensitive boolean not null default false,
  is_active boolean not null default true,
  is_system boolean not null default false,
  visibility text not null check (visibility in ('public', 'couple', 'private')),
  couple_id text references public.couples(id) on delete cascade,
  created_by text references public.profiles(id),
  scoring_rule text not null,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  locale text not null default 'en',
  depends_on jsonb,
  created_at text not null,
  updated_at text not null
);
create index questions_category on public.questions (category_id, is_active);

create table public.question_options (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  label text not null,
  value text not null,
  image_url text,
  sort_order integer not null default 0
);
create index question_options_question on public.question_options (question_id, sort_order);

create table public.quiz_templates (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  mode text not null,
  question_count integer not null,
  sort_order integer not null default 0
);

create table public.quiz_rounds (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  created_by text not null references public.profiles(id),
  mode text not null,
  title text not null,
  status text not null check (status in ('active', 'complete')),
  size integer not null,
  categories text[] not null default '{}',
  difficulty text not null,
  timer_seconds integer,
  include_sensitive boolean not null default false,
  results_shared boolean not null default false,
  created_at text not null,
  updated_at text not null
);
create index quiz_rounds_couple on public.quiz_rounds (couple_id, created_at);

create table public.quiz_round_questions (
  id text primary key,
  round_id text not null references public.quiz_rounds(id) on delete cascade,
  question_id text not null references public.questions(id),
  position integer not null,
  unique (round_id, question_id),
  unique (round_id, position)
);

create table public.quiz_sessions (
  id text primary key,
  round_id text not null references public.quiz_rounds(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  current_index integer not null default 0,
  started_at text not null,
  completed_at text,
  updated_at text not null,
  unique (round_id, user_id)
);

create table public.user_answers (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text not null references public.couples(id) on delete cascade,
  question_id text not null references public.questions(id),
  round_id text references public.quiz_rounds(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  created_at text not null,
  updated_at text not null,
  unique (user_id, couple_id, question_id)
);
create index user_answers_couple on public.user_answers (couple_id, question_id);

create table public.answer_predictions (
  id text primary key,
  predictor_id text not null references public.profiles(id) on delete cascade,
  subject_id text not null references public.profiles(id),
  couple_id text not null references public.couples(id) on delete cascade,
  question_id text not null references public.questions(id),
  round_id text not null references public.quiz_rounds(id) on delete cascade,
  kind text not null check (kind in ('partner', 'reverse')),
  payload jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  created_at text not null,
  updated_at text not null,
  unique (predictor_id, round_id, question_id, kind)
);

create table public.answer_reveals (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  question_id text not null references public.questions(id),
  owner_id text not null references public.profiles(id) on delete cascade,
  viewer_id text not null references public.profiles(id) on delete cascade,
  round_id text not null references public.quiz_rounds(id) on delete cascade,
  created_at text not null,
  unique (owner_id, viewer_id, question_id, round_id)
);

create table public.similarity_marks (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  question_id text not null references public.questions(id),
  user_id text not null references public.profiles(id) on delete cascade,
  mark text not null check (mark in ('similar', 'partial', 'different')),
  updated_at text not null,
  unique (user_id, couple_id, question_id)
);

create table public.score_snapshots (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  round_id text references public.quiz_rounds(id) on delete cascade,
  user_id text references public.profiles(id) on delete cascade,
  score numeric,
  correct integer not null default 0,
  close integer not null default 0,
  incorrect integer not null default 0,
  skipped integer not null default 0,
  eligible integer not null default 0,
  points numeric not null default 0,
  created_at text not null
);
create index score_snapshots_user on public.score_snapshots (user_id, created_at);

create table public.personality_tests (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  disclaimer text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.personality_questions (
  id text primary key,
  test_id text not null references public.personality_tests(id) on delete cascade,
  prompt text not null,
  help_text text,
  dimension text not null,
  reverse boolean not null default false,
  answer_type text not null check (answer_type in ('scale', 'single', 'multi')),
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  sensitive boolean not null default false
);

create table public.personality_sessions (
  id text primary key,
  test_id text not null references public.personality_tests(id),
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete set null,
  status text not null check (status in ('in_progress', 'completed')),
  current_index integer not null default 0,
  started_at text not null,
  completed_at text
);

create table public.personality_answers (
  id text primary key,
  session_id text not null references public.personality_sessions(id) on delete cascade,
  question_id text not null references public.personality_questions(id),
  user_id text not null references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  skipped boolean not null default false,
  updated_at text not null,
  unique (session_id, question_id)
);

create table public.personality_results (
  id text primary key,
  session_id text not null references public.personality_sessions(id) on delete cascade,
  test_id text not null references public.personality_tests(id),
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete set null,
  scores jsonb not null default '{}'::jsonb,
  summary text not null,
  suggestions text[] not null default '{}',
  shared boolean not null default false,
  created_at text not null,
  updated_at text not null
);

create table public.conversation_cards (
  id text primary key,
  slug text not null,
  prompt text not null,
  depth text not null,
  mood text not null,
  topic text not null,
  sensitive boolean not null default false,
  is_system boolean not null default false,
  couple_id text references public.couples(id) on delete cascade,
  created_by text references public.profiles(id),
  is_active boolean not null default true,
  locale text not null default 'en'
);

create table public.saved_questions (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  card_id text references public.conversation_cards(id) on delete cascade,
  question_id text references public.questions(id) on delete cascade,
  created_at text not null
);

create table public.card_activity (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete cascade,
  card_id text not null references public.conversation_cards(id) on delete cascade,
  answered boolean not null default false,
  hidden boolean not null default false,
  note text,
  updated_at text not null,
  unique (user_id, card_id)
);

create table public.shared_reflections (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  card_id text references public.conversation_cards(id) on delete set null,
  question_id text references public.questions(id) on delete set null,
  author_id text not null references public.profiles(id),
  body text not null,
  created_at text not null,
  updated_at text not null
);

create table public.couple_challenges (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  cadence text not null check (cadence in ('daily', 'weekly', 'once')),
  points integer not null default 0,
  is_active boolean not null default true
);

create table public.challenge_progress (
  id text primary key,
  challenge_id text not null references public.couple_challenges(id),
  couple_id text not null references public.couples(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  period_key text not null,
  status text not null check (status in ('active', 'completed', 'skipped')),
  completed_at text,
  created_at text not null,
  unique (challenge_id, couple_id, user_id, period_key)
);

create table public.achievements (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  points integer not null default 0
);

create table public.user_achievements (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id),
  couple_id text references public.couples(id) on delete set null,
  earned_at text not null,
  unique (user_id, achievement_id)
);

create table public.couple_memories (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  author_id text not null references public.profiles(id),
  title text not null,
  body text,
  kind text not null check (kind in ('milestone', 'trip', 'moment', 'plan', 'note')),
  occurred_on text,
  visibility text not null check (visibility in ('shared', 'private')),
  remind_on text,
  created_at text not null,
  updated_at text not null
);
create index couple_memories_couple on public.couple_memories (couple_id, occurred_on);

create table public.memory_attachments (
  id text primary key,
  memory_id text not null references public.couple_memories(id) on delete cascade,
  couple_id text not null references public.couples(id) on delete cascade,
  owner_id text not null references public.profiles(id),
  file_name text not null,
  content_type text not null,
  size integer not null,
  storage_path text not null,
  created_at text not null
);

create table public.notifications (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at text,
  created_at text not null
);
create index notifications_user on public.notifications (user_id, created_at);

create table public.user_preferences (
  user_id text primary key references public.profiles(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  locale text not null default 'en' check (locale in ('en', 'fil')),
  email_notifications boolean not null default false,
  in_app_notifications boolean not null default true,
  reminder_hour integer,
  streak_paused boolean not null default false,
  reduced_motion boolean not null default false,
  daily_streak integer not null default 0,
  last_daily_on text,
  points integer not null default 0,
  recent_card_ids text[] not null default '{}',
  onboarding_step text not null default 'profile',
  onboarding_completed boolean not null default false
);

create table public.reports (
  id text primary key,
  reporter_id text not null references public.profiles(id),
  target_type text not null check (target_type in ('user', 'question', 'memory', 'card')),
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at text not null
);

create table public.user_blocks (
  id text primary key,
  blocker_id text not null references public.profiles(id) on delete cascade,
  blocked_id text not null references public.profiles(id) on delete cascade,
  created_at text not null,
  unique (blocker_id, blocked_id)
);

create table public.audit_events (
  id text primary key,
  user_id text references public.profiles(id) on delete set null,
  action text not null,
  couple_id text,
  created_at text not null
);

create table public.login_attempts (
  id text primary key,
  key text not null,
  created_at text not null
);
create index login_attempts_key on public.login_attempts (key, created_at);

create table public.support_messages (
  id text primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at text not null
);

create table public.media_objects (
  id text primary key,
  owner_id text not null references public.profiles(id) on delete cascade,
  couple_id text references public.couples(id) on delete cascade,
  file_name text not null,
  content_type text not null,
  size integer not null,
  storage_path text not null,
  created_at text not null
);

-- Secrets and rate-limit rows are not readable through the Data API.
revoke all on public.credentials, public.email_tokens, public.login_attempts from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.credentials enable row level security;
alter table public.email_tokens enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.reconnect_requests enable row level security;
alter table public.question_categories enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_templates enable row level security;
alter table public.quiz_rounds enable row level security;
alter table public.quiz_round_questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.user_answers enable row level security;
alter table public.answer_predictions enable row level security;
alter table public.answer_reveals enable row level security;
alter table public.similarity_marks enable row level security;
alter table public.score_snapshots enable row level security;
alter table public.personality_tests enable row level security;
alter table public.personality_questions enable row level security;
alter table public.personality_sessions enable row level security;
alter table public.personality_answers enable row level security;
alter table public.personality_results enable row level security;
alter table public.conversation_cards enable row level security;
alter table public.saved_questions enable row level security;
alter table public.card_activity enable row level security;
alter table public.shared_reflections enable row level security;
alter table public.couple_challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.couple_memories enable row level security;
alter table public.memory_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;
alter table public.reports enable row level security;
alter table public.user_blocks enable row level security;
alter table public.audit_events enable row level security;
alter table public.login_attempts enable row level security;
alter table public.support_messages enable row level security;
alter table public.media_objects enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid()::text or public.is_couple_member((
    select m.couple_id from public.couple_members m
    where m.user_id = profiles.id and m.status = 'active'
    limit 1
  )));

create policy couples_select on public.couples for select to authenticated
  using (public.is_couple_member(id));

create policy couple_members_select on public.couple_members for select to authenticated
  using (user_id = auth.uid()::text or public.is_couple_member(couple_id));

create policy invitations_select on public.couple_invitations for select to authenticated
  using (created_by = auth.uid()::text or accepted_by = auth.uid()::text or public.is_couple_member(couple_id));

create policy reconnect_select on public.reconnect_requests for select to authenticated
  using (requester_id = auth.uid()::text or partner_id = auth.uid()::text);

create policy categories_select on public.question_categories for select to authenticated using (true);
create policy templates_select on public.quiz_templates for select to authenticated using (true);
create policy achievements_select on public.achievements for select to authenticated using (true);
create policy challenges_select on public.couple_challenges for select to authenticated using (true);
create policy tests_select on public.personality_tests for select to authenticated using (is_active or public.is_admin());
create policy test_questions_select on public.personality_questions for select to authenticated using (true);

create policy questions_select on public.questions for select to authenticated
  using (public.question_is_visible(id) or public.is_admin());

create policy options_select on public.question_options for select to authenticated
  using (public.question_is_visible(question_id) or public.is_admin());

create policy rounds_select on public.quiz_rounds for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (mode <> 'solo' or created_by = auth.uid()::text or results_shared)
  );

create policy round_questions_select on public.quiz_round_questions for select to authenticated
  using (exists (
    select 1 from public.quiz_rounds r
    where r.id = quiz_round_questions.round_id and public.is_couple_member(r.couple_id)
  ));

create policy sessions_select on public.quiz_sessions for select to authenticated
  using (user_id = auth.uid()::text);

create policy answers_select on public.user_answers for select to authenticated
  using (
    user_id = auth.uid()::text
    or (
      public.is_couple_member(couple_id)
      and public.answer_revealed_to_me(user_id, question_id, couple_id)
      and (
        not exists (select 1 from public.questions q where q.id = user_answers.question_id and q.sensitive)
        or coalesce((payload ->> 'shareWithPartner')::boolean, false)
      )
    )
  );

create policy predictions_select on public.answer_predictions for select to authenticated
  using (
    predictor_id = auth.uid()::text
    or (
      subject_id = auth.uid()::text
      and public.answer_revealed_to_me(predictor_id, question_id, couple_id)
    )
  );

create policy reveals_select on public.answer_reveals for select to authenticated
  using (owner_id = auth.uid()::text or viewer_id = auth.uid()::text);

create policy similarity_select on public.similarity_marks for select to authenticated
  using (user_id = auth.uid()::text or public.is_couple_member(couple_id));

create policy snapshots_select on public.score_snapshots for select to authenticated
  using (user_id = auth.uid()::text or (user_id is null and public.is_couple_member(couple_id)));

create policy personality_sessions_select on public.personality_sessions for select to authenticated
  using (user_id = auth.uid()::text);

create policy personality_answers_select on public.personality_answers for select to authenticated
  using (user_id = auth.uid()::text);

create policy personality_results_select on public.personality_results for select to authenticated
  using (
    user_id = auth.uid()::text
    or (shared and couple_id is not null and public.is_couple_member(couple_id))
  );

create policy cards_select on public.conversation_cards for select to authenticated
  using (is_system or created_by = auth.uid()::text or (couple_id is not null and public.is_couple_member(couple_id)));

create policy saved_select on public.saved_questions for select to authenticated
  using (user_id = auth.uid()::text);

create policy card_activity_select on public.card_activity for select to authenticated
  using (user_id = auth.uid()::text);

create policy reflections_select on public.shared_reflections for select to authenticated
  using (public.is_couple_member(couple_id));

create policy challenge_progress_select on public.challenge_progress for select to authenticated
  using (public.is_couple_member(couple_id));

create policy user_achievements_select on public.user_achievements for select to authenticated
  using (user_id = auth.uid()::text or (couple_id is not null and public.is_couple_member(couple_id)));

create policy memories_select on public.couple_memories for select to authenticated
  using (author_id = auth.uid()::text or (visibility = 'shared' and public.is_couple_member(couple_id)));

create policy attachments_select on public.memory_attachments for select to authenticated
  using (owner_id = auth.uid()::text or public.is_couple_member(couple_id));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid()::text);

create policy preferences_select on public.user_preferences for select to authenticated
  using (user_id = auth.uid()::text);

create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid()::text or public.is_admin());

create policy blocks_select on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid()::text or blocked_id = auth.uid()::text);

create policy audit_select on public.audit_events for select to authenticated
  using (user_id = auth.uid()::text);

create policy media_select on public.media_objects for select to authenticated
  using (owner_id = auth.uid()::text or (couple_id is not null and public.is_couple_member(couple_id)));

grant execute on function public.is_couple_member(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.answer_revealed_to_me(text, text, text) to authenticated;
grant execute on function public.question_is_visible(text) to authenticated;

do $storage$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'private-media',
      'private-media',
      false,
      8000000,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav']
    )
    on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists private_media_owner_read on storage.objects';
    execute 'drop policy if exists private_media_owner_write on storage.objects';
    execute $policy$
      create policy private_media_owner_read on storage.objects
      for select to authenticated
      using (bucket_id = 'private-media' and (storage.foldername(name))[1] = auth.uid()::text)
    $policy$;
    execute $policy$
      create policy private_media_owner_write on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'private-media'
        and (storage.foldername(name))[1] = auth.uid()::text
        and coalesce((metadata ->> 'size')::integer, 0) <= 8000000
      )
    $policy$;
  end if;
end
$storage$;
