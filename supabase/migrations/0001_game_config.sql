-- Estágio 0 da economia server-autoritativa (ver .claude/plans ou changelog):
-- move as taxas do Painel Admin (xpRate/goldRate/lootRate/etc.) pra fora do
-- save do jogador (onde qualquer um podia se auto-conceder xpRate:1000) pra
-- uma tabela privilegiada, só gravável por uma Edge Function que confere a
-- whitelist abaixo.

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy admins_select_self on public.admins for select using (auth.uid() = user_id);

insert into public.admins (user_id) values
  ('51dbb42c-1595-44e2-9435-43d65fc6d3fd'),
  ('d09b245d-6453-46b0-abda-df564f664e8d')
on conflict do nothing;

create table public.game_config (
  id int primary key default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint game_config_single_row check (id = 1)
);
alter table public.game_config enable row level security;
-- leitura pública: o jogo ainda calcula XP/gold no cliente (Estágio 1 move
-- isso pro servidor); escrita só pela Edge Function admin-config-set
-- (service_role), nenhuma policy de INSERT/UPDATE/DELETE pro cliente.
create policy game_config_select_all on public.game_config for select using (true);

insert into public.game_config (id, config) values (1, '{
  "xpRate": 1,
  "skillRate": 1,
  "goldRate": 1,
  "lootRate": 1,
  "relicDropChance": 0.10,
  "spawnDelayMin": 1.2,
  "spawnDelayMax": 3,
  "useZoneMultipliers": false,
  "zoneMultipliers": {},
  "huntSpawns": {},
  "rarityWeights": { "uncommon": 52, "rare": 28, "epic": 15, "legendary": 5 },
  "lootOverrides": {},
  "marketEnabled": false,
  "staminaEnabled": false,
  "consumeAmmo": false
}'::jsonb)
on conflict (id) do nothing;
