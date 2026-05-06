ALTER TABLE public.games ADD COLUMN IF NOT EXISTS spectators jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS pending_draw_rank text;