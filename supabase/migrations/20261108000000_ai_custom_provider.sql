-- Custom OpenCode provider ID used when ai_provider = 'custom'.
alter table public.site_settings
  add column if not exists ai_custom_provider text not null default '';

-- Default chatbot routing to Google Gemini.
alter table public.site_settings
  alter column ai_provider set default 'google';

update public.site_settings
set
  ai_provider = 'google',
  ai_model = coalesce(nullif(ai_model, ''), 'gemini-2.5-flash'),
  ai_enabled = coalesce(ai_enabled, true),
  ai_name = coalesce(nullif(ai_name, ''), 'WenX'),
  ai_custom_provider = coalesce(ai_custom_provider, '')
where id = 'default';

notify pgrst, 'reload schema';
