-- Marco 2 da economia server-autoritativa: sessão de caça e stats do
-- personagem passam a ser gravados pelo servidor sempre-ligado (Railway),
-- nunca mais aceitos como número declarado pelo cliente. Chave por
-- (user_id, slot) porque cada conta tem até 2 personagens independentes
-- (ver src/application/persistenceUseCases.js: normalizeAccountData).

create table public.hunt_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  zone_id text not null,
  boss_only boolean not null default false,
  started_at timestamptz not null default now(),
  last_settled_at timestamptz not null default now(),
  active boolean not null default true,
  rng_seed bytea not null default gen_random_bytes(16),
  -- snapshot de atk/def/spd/nível/vocação tirado no hunt-start (ver server/) —
  -- travado pra sessão inteira; mudar equipamento/skill exige nova sessão.
  atk numeric not null,
  def numeric not null,
  spd numeric not null,
  level int not null,
  vocation text not null
);
create unique index hunt_sessions_one_active_per_slot on public.hunt_sessions (user_id, slot) where active;
alter table public.hunt_sessions enable row level security;
create policy hunt_sessions_select_own on public.hunt_sessions for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor (service_role) grava.

create table public.player_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  gold bigint not null default 0,
  xp bigint not null default 0,
  level int not null default 1,
  total_gold_earned bigint not null default 0,
  total_kills bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.player_stats enable row level security;
create policy player_stats_select_own on public.player_stats for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor (service_role) grava.
