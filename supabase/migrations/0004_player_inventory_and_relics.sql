-- Marco 3 da economia server-autoritativa: loot e relíquias passam a ser
-- decididos e gravados pelo servidor de caçada (Railway), nunca mais um
-- Math.random() do cliente que ninguém valida (ver server/src/huntEngine.js).

create table public.player_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  item_id text not null,
  qty integer not null default 0 check (qty >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot, item_id)
);
alter table public.player_inventory enable row level security;
create policy player_inventory_select_own on public.player_inventory for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor (service_role) grava.

create table public.player_relics (
  -- TEXT, não uuid: o seed (ver 0005) precisa preservar o id LEGADO
  -- ('relic_123', formato de G.relicSeq no cliente) das relíquias que já
  -- existiam no save, senão trocar o id "desequiparia" silenciosamente
  -- quem já tinha uma relíquia equipada (G.equipment guarda esse id).
  id text not null default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  item_id text not null,
  rarity text not null,
  bonus_pct numeric not null,
  -- proveniência: de qual sessão de caça veio (nunca existiu antes — hoje um
  -- relic no save é só um objeto solto, sem como provar que foi realmente
  -- sorteado). Nulo só pra relíquias migradas do save antigo (ver seed).
  source_session_id uuid references public.hunt_sessions(id) on delete set null,
  awarded_at timestamptz not null default now(),
  -- chave composta, não só `id`: o id legado é um contador POR PERSONAGEM
  -- (G.relicSeq), então "relic_1" pode existir em várias contas diferentes.
  primary key (user_id, slot, id)
);
alter table public.player_relics enable row level security;
create policy player_relics_select_own on public.player_relics for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor (service_role) grava.
