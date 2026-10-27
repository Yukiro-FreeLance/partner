-- Shared date plans, daily itineraries, and expense records.
-- The Next.js server uses the service role after its own couple-membership checks.
-- These policies protect the Data API. Money totals are calculated from itinerary_expenses.

create table public.date_plans (
  id text primary key,
  couple_id text not null references public.couples(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text,
  destination text,
  start_date text not null check (start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  end_date text not null check (end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  event_type text not null check (event_type in ('concert', 'travel', 'anniversary', 'date_night', 'vacation', 'other')),
  cover_image text,
  estimated_budget numeric(14,2) not null default 0 check (estimated_budget >= 0),
  currency text not null default 'PHP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'planning' check (status in ('planning', 'ready', 'ongoing', 'completed')),
  split_method text not null default 'fifty_fifty' check (split_method in ('fifty_fifty', 'custom_percent', 'equal_fixed', 'individual')),
  custom_split_percent numeric(5,2) not null default 50 check (custom_split_percent >= 0 and custom_split_percent <= 100),
  fixed_contribution numeric(14,2) not null default 0 check (fixed_contribution >= 0),
  warning_threshold numeric(5,2) not null default 80 check (warning_threshold >= 1 and warning_threshold <= 100),
  daily_limit numeric(14,2) check (daily_limit is null or daily_limit >= 0),
  created_by text not null references public.profiles(id),
  updated_by text references public.profiles(id),
  created_at text not null,
  updated_at text not null,
  check (end_date >= start_date)
);

create table public.itinerary_days (
  id text primary key,
  date_plan_id text not null references public.date_plans(id) on delete cascade,
  date text not null check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null
);

create table public.itinerary_activities (
  id text primary key,
  itinerary_day_id text not null references public.itinerary_days(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  location text,
  map_url text,
  start_time text check (start_time is null or start_time ~ '^[0-9]{2}:[0-9]{2}$'),
  end_time text check (end_time is null or end_time ~ '^[0-9]{2}:[0-9]{2}$'),
  estimated_cost numeric(14,2) not null default 0 check (estimated_cost >= 0),
  actual_cost numeric(14,2) not null default 0 check (actual_cost >= 0),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  sort_order integer not null default 0,
  notes text,
  reservation text,
  photo_path text,
  created_by text not null references public.profiles(id),
  updated_by text references public.profiles(id),
  created_at text not null,
  updated_at text not null
);

create table public.itinerary_expenses (
  id text primary key,
  date_plan_id text not null references public.date_plans(id) on delete cascade,
  itinerary_day_id text references public.itinerary_days(id) on delete set null,
  itinerary_activity_id text references public.itinerary_activities(id) on delete set null,
  expense_name text not null check (char_length(expense_name) between 1 and 160),
  category text not null check (category in ('flight', 'accommodation', 'food', 'transportation', 'activities', 'merchandise', 'shopping', 'other')),
  estimated_amount numeric(14,2) not null default 0 check (estimated_amount >= 0),
  actual_amount numeric(14,2) not null default 0 check (actual_amount >= 0),
  paid_by text not null,
  split_method text not null default 'inherit' check (split_method in ('inherit', 'fifty_fifty', 'custom_percent', 'equal_fixed', 'individual')),
  custom_split_percent numeric(5,2) check (custom_split_percent is null or (custom_split_percent >= 0 and custom_split_percent <= 100)),
  payment_method text check (payment_method is null or payment_method in ('cash', 'card', 'transfer', 'ewallet', 'other')),
  expense_date text not null,
  receipt_path text,
  notes text,
  status text not null default 'planned' check (status in ('planned', 'paid', 'partial', 'cancelled')),
  created_by text not null references public.profiles(id),
  updated_by text references public.profiles(id),
  created_at text not null,
  updated_at text not null
);

create table public.itinerary_checklists (
  id text primary key,
  itinerary_activity_id text not null references public.itinerary_activities(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  is_completed boolean not null default false,
  completed_by text references public.profiles(id),
  completed_at text,
  created_at text not null,
  updated_at text not null
);

create table public.itinerary_comments (
  id text primary key,
  date_plan_id text not null references public.date_plans(id) on delete cascade,
  itinerary_activity_id text references public.itinerary_activities(id) on delete cascade,
  author_id text not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at text not null,
  updated_at text not null
);

create table public.itinerary_history (
  id text primary key,
  date_plan_id text not null references public.date_plans(id) on delete cascade,
  actor_id text not null references public.profiles(id),
  action text not null,
  summary text not null,
  created_at text not null
);

create index date_plans_couple on public.date_plans (couple_id, start_date);
create index itinerary_days_plan on public.itinerary_days (date_plan_id, sort_order);
create index itinerary_activities_day on public.itinerary_activities (itinerary_day_id, sort_order);
create index itinerary_expenses_plan on public.itinerary_expenses (date_plan_id, expense_date);
create index itinerary_expenses_activity on public.itinerary_expenses (itinerary_activity_id);
create index itinerary_checklists_activity on public.itinerary_checklists (itinerary_activity_id);
create index itinerary_comments_plan on public.itinerary_comments (date_plan_id, created_at);
create index itinerary_history_plan on public.itinerary_history (date_plan_id, created_at);

alter table public.date_plans enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_activities enable row level security;
alter table public.itinerary_expenses enable row level security;
alter table public.itinerary_checklists enable row level security;
alter table public.itinerary_comments enable row level security;
alter table public.itinerary_history enable row level security;

create policy date_plans_member on public.date_plans for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy itinerary_days_member on public.itinerary_days for all to authenticated
  using (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_days.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_days.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  );

create policy itinerary_activities_member on public.itinerary_activities for all to authenticated
  using (
    exists (
      select 1 from public.itinerary_days d
      join public.date_plans p on p.id = d.date_plan_id
      where d.id = itinerary_activities.itinerary_day_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.itinerary_days d
      join public.date_plans p on p.id = d.date_plan_id
      where d.id = itinerary_activities.itinerary_day_id
        and public.is_couple_member(p.couple_id)
    )
  );

create policy itinerary_expenses_member on public.itinerary_expenses for all to authenticated
  using (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_expenses.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_expenses.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  );

create policy itinerary_checklists_member on public.itinerary_checklists for all to authenticated
  using (
    exists (
      select 1 from public.itinerary_activities a
      join public.itinerary_days d on d.id = a.itinerary_day_id
      join public.date_plans p on p.id = d.date_plan_id
      where a.id = itinerary_checklists.itinerary_activity_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.itinerary_activities a
      join public.itinerary_days d on d.id = a.itinerary_day_id
      join public.date_plans p on p.id = d.date_plan_id
      where a.id = itinerary_checklists.itinerary_activity_id
        and public.is_couple_member(p.couple_id)
    )
  );

create policy itinerary_comments_member on public.itinerary_comments for all to authenticated
  using (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_comments.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_comments.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  );

create policy itinerary_history_member on public.itinerary_history for all to authenticated
  using (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_history.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  )
  with check (
    exists (
      select 1 from public.date_plans p
      where p.id = itinerary_history.date_plan_id
        and public.is_couple_member(p.couple_id)
    )
  );

revoke all on table public.date_plans, public.itinerary_days, public.itinerary_activities, public.itinerary_expenses, public.itinerary_checklists, public.itinerary_comments, public.itinerary_history from anon;
grant select, insert, update, delete on table public.date_plans, public.itinerary_days, public.itinerary_activities, public.itinerary_expenses, public.itinerary_checklists, public.itinerary_comments, public.itinerary_history to authenticated;
