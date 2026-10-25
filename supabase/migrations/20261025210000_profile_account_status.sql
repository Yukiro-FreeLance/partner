alter table public.profiles
  add column if not exists account_status text not null default 'active';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_status_check') then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'archived', 'deleted'));
  end if;
end $$;
