
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar text not null default '🤠',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Cowpoke'),
    coalesce(new.raw_user_meta_data->>'avatar', '🤠')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby', -- lobby | playing | finished
  players jsonb not null default '[]'::jsonb, -- [{id, name, avatar}]
  hands jsonb not null default '{}'::jsonb,   -- { user_id: [card,...] }
  deck jsonb not null default '[]'::jsonb,
  discard jsonb not null default '[]'::jsonb,
  current_suit text,
  current_turn uuid,
  direction int not null default 1,
  draw_count int not null default 0,
  last_action jsonb,
  winner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.games enable row level security;

-- Helper: is user a player in game
create or replace function public.is_player_in_game(_game_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.games g, jsonb_array_elements(g.players) p
    where g.id = _game_id and (p->>'id')::uuid = _user_id
  );
$$;

create policy "games_select_players_or_lobby" on public.games for select
  using (status = 'lobby' or public.is_player_in_game(id, auth.uid()));

create policy "games_insert_authed" on public.games for insert
  with check (auth.uid() = host_id);

-- Updates only via RPC (security definer); no direct update policy.

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.profiles;
alter table public.games replica identity full;
