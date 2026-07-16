-- Marco 4 da economia server-autoritativa: o que está EQUIPADO e o nível das
-- SKILLS treinadas passam a ser autoritativos no servidor — hoje ainda vêm
-- como snapshot enviado pelo cliente no hunt-start (ver server/src/
-- huntEngine.js, limitação documentada desde o Marco 2). Sem isso, alguém
-- fecha o buraco de XP/ouro mas ainda infla dano/velocidade inventando
-- equipamento/skill no snapshot — o que indiretamente infla XP/ouro de novo
-- (spd mais alto = mais kills/hora).

create table public.player_equipment (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  eq_slot text not null, -- 'weapon'|'shield'|'helmet'|'armor'|'legs'|'boots'|'ring'|'amulet'|'ammo' etc (mesmas chaves de G.equipment)
  item_id text, -- id do item OU id de relíquia (ver player_relics); null = slot vazio
  updated_at timestamptz not null default now(),
  primary key (user_id, slot, eq_slot)
);
alter table public.player_equipment enable row level security;
create policy player_equipment_select_own on public.player_equipment for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor (service_role) grava
-- (equipar/desequipar passa a ser uma ação validada, ver equip-item no servidor).

create table public.player_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (0,1)),
  -- {magic:{lv,tries}, fist:{lv,tries}, ...} — mesmo shape que
  -- domain/character.js: applySkillGain espera (tries = progresso parcial
  -- pro próximo nível; por isso não são colunas inteiras separadas).
  skills jsonb not null default '{
    "magic": {"lv": 0, "tries": 0}, "fist": {"lv": 10, "tries": 0},
    "club": {"lv": 10, "tries": 0}, "sword": {"lv": 10, "tries": 0},
    "axe": {"lv": 10, "tries": 0}, "distance": {"lv": 10, "tries": 0},
    "shielding": {"lv": 10, "tries": 0}
  }'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.player_skills enable row level security;
create policy player_skills_select_own on public.player_skills for select using (auth.uid() = user_id);
-- sem policy de insert/update/delete pro cliente — só o servidor grava (treino
-- de skill passa a ser contabilizado no próprio settle da caçada).
