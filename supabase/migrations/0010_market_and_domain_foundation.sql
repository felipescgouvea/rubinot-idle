-- Fundação da migração server-authoritative (fase de arquitetura):
-- 1) Market entre jogadores construído direto no modelo novo (não havia
--    tabelas/RPCs rubinot_market_* em produção — o client já chamava algo
--    inexistente, silenciosamente engolido pelo try/catch).
-- 2) player_stats ganha rubini (moeda premium) e boosts (jsonb), hoje só
--    guardados no save do cliente.
-- 3) rubinot_idle_scores ganha identidade (user_id, slot) — o "secret"
--    gerado no navegador deixa de ser a única prova de dono da linha.
-- 4) Tabelas placeholder (schema mínimo) para as mecânicas ainda 100%
--    client-side: prey, charms, bestiary/charms, battle pass, arena, tasks,
--    training, outfits, world. player_daily_reward já ganha colunas
--    concretas por ser a mecânica piloto desta fase.
-- Ver plano: C:\Users\Felipe\.claude\plans\elegant-twirling-wirth.md

create table public.market_wallet (
  user_id uuid not null references auth.users(id),
  slot smallint not null check (slot in (0,1)),
  balance bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.market_wallet enable row level security;

create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id),
  seller_slot smallint not null check (seller_slot in (0,1)),
  seller_name text not null,
  item_id text not null,
  qty integer not null check (qty > 0),
  price_per_unit bigint not null check (price_per_unit > 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.market_listings enable row level security;
create policy "listings ativas são públicas" on public.market_listings
  for select using (status = 'active');

alter table public.player_stats
  add column rubini bigint not null default 0,
  add column boosts jsonb not null default '{}'::jsonb;

alter table public.rubinot_idle_scores
  add column user_id uuid references auth.users(id),
  add column slot smallint check (slot is null or slot in (0,1));
create unique index rubinot_idle_scores_user_slot_key
  on public.rubinot_idle_scores (user_id, slot)
  where user_id is not null;

create table public.player_prey (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_charms (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_bestiary (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_battle_pass (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_arena (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_tasks (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_training (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_outfits (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));
create table public.player_world (user_id uuid not null references auth.users(id), slot smallint not null check (slot in (0,1)), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, slot));

create table public.player_daily_reward (
  user_id uuid not null references auth.users(id),
  slot smallint not null check (slot in (0,1)),
  last_claim_date text,
  streak integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.player_prey enable row level security;
alter table public.player_charms enable row level security;
alter table public.player_bestiary enable row level security;
alter table public.player_battle_pass enable row level security;
alter table public.player_arena enable row level security;
alter table public.player_tasks enable row level security;
alter table public.player_training enable row level security;
alter table public.player_outfits enable row level security;
alter table public.player_world enable row level security;
alter table public.player_daily_reward enable row level security;
