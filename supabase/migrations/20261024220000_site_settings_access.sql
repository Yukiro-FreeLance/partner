-- Site settings stay server-managed. The service role bypasses these policies.
-- A signed-in super admin may read and update the row. Other roles, including regular admins, cannot.

alter table public.site_settings enable row level security;

drop policy if exists site_settings_super_admin on public.site_settings;
create policy site_settings_super_admin on public.site_settings
for all to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'super_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid()::text and role = 'super_admin'
  )
);

create index if not exists user_preferences_user on public.user_preferences (user_id);
create index if not exists media_objects_owner on public.media_objects (owner_id);
