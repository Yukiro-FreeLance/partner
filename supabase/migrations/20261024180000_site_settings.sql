create table if not exists public.site_settings (
  id text primary key,
  site_name text not null,
  title text not null,
  description text not null,
  og_title text not null,
  og_description text not null,
  keywords text not null default '',
  theme_color text not null default '#6d28d9',
  favicon_path text,
  favicon_type text,
  apple_icon_path text,
  apple_icon_type text,
  icon_path text,
  icon_type text,
  og_image_path text,
  og_image_type text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
