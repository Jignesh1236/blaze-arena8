ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_host_id_fkey;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_winner_id_fkey;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_current_turn_fkey;