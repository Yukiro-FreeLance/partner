alter table public.site_settings add column if not exists ai_enabled boolean not null default true;
alter table public.site_settings add column if not exists ai_name text not null default 'WenX';
alter table public.site_settings add column if not exists ai_provider text not null default 'google';
alter table public.site_settings add column if not exists ai_model text not null default 'gemini-2.5-flash';
alter table public.site_settings add column if not exists ai_custom_provider text not null default '';
