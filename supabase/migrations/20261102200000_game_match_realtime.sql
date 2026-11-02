-- Game state is delivered to both devices through Supabase Realtime.
alter publication supabase_realtime add table public.game_matches;
