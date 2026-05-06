-- Drop existing policies on games
DROP POLICY IF EXISTS games_select_players_or_lobby ON public.games;
DROP POLICY IF EXISTS games_insert_authed ON public.games;

-- Open policies (server uses service role to write/update; clients only need read for realtime)
CREATE POLICY games_select_all ON public.games FOR SELECT USING (true);
CREATE POLICY games_insert_any ON public.games FOR INSERT WITH CHECK (true);