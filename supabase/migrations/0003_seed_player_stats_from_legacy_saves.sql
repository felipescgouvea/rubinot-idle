-- Semeia public.player_stats a partir do save (blob) que já existe hoje em
-- public.saves, pra ninguém perder progresso quando o cliente passar a
-- confiar nesta tabela em vez do blob. Roda uma vez só (idempotente via ON
-- CONFLICT DO NOTHING); cobre os dois formatos de save (ver
-- src/application/persistenceUseCases.js: normalizeAccountData):
--  - novo:  { activeSlot, slots: [slot0, slot1] }
--  - antigo (pré multi-personagem): o personagem inteiro na raiz = slot 0.
-- Só semeia slots que de fato têm personagem criado (vocation preenchida).
insert into public.player_stats (user_id, slot, gold, xp, level, total_gold_earned, total_kills, updated_at)
select
  s.user_id,
  x.slot_idx,
  coalesce((x.slot_data->>'gold')::bigint, 0),
  coalesce((x.slot_data->>'xp')::bigint, 0),
  coalesce((x.slot_data->>'level')::int, 1),
  coalesce((x.slot_data->>'totalGoldEarned')::bigint, 0),
  coalesce((x.slot_data->>'totalKills')::bigint, 0),
  now()
from public.saves s
cross join lateral (
  select 0 as slot_idx,
    case when jsonb_typeof(s.data->'slots') = 'array' then s.data->'slots'->0 else s.data end as slot_data
  union all
  select 1 as slot_idx,
    case when jsonb_typeof(s.data->'slots') = 'array' then s.data->'slots'->1 else null end as slot_data
) x
where x.slot_data is not null
  and jsonb_typeof(x.slot_data) = 'object'
  and x.slot_data->>'vocation' is not null
on conflict (user_id, slot) do nothing;
