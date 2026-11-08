-- Gemini 2.5 Flash is no longer available to new Google AI users.
-- Prefer Gemini 3.8 Flash for the WenX chatbot default.
alter table public.site_settings
  alter column ai_model set default 'gemini-3.8-flash';

update public.site_settings
set ai_model = 'gemini-3.8-flash'
where id = 'default'
  and ai_model in ('', 'gemini-2.5-flash', 'models/gemini-2.5-flash');

notify pgrst, 'reload schema';
