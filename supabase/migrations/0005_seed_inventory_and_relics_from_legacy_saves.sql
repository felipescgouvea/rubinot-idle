-- Mesma lógica de 0003 (normalizeAccountData): pega o slot_data de cada save
-- existente (novo formato com 'slots', ou o formato antigo = slot 0 direto)
-- e semeia inventário + relíquias, pra ninguém perder item/relíquia quando o
-- cliente passar a ler player_inventory/player_relics em vez do blob.
with slots as (
  select
    s.user_id,
    x.slot_idx,
    x.slot_data
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
)
insert into public.player_inventory (user_id, slot, item_id, qty, updated_at)
select slots.user_id, slots.slot_idx, inv.key, greatest(0, (inv.value)::int), now()
from slots
cross join lateral jsonb_each_text(coalesce(slots.slot_data->'inventory', '{}'::jsonb)) as inv(key, value)
where (inv.value)::int > 0
on conflict (user_id, slot, item_id) do nothing;

with slots as (
  select
    s.user_id,
    x.slot_idx,
    x.slot_data
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
)
insert into public.player_relics (id, user_id, slot, item_id, rarity, bonus_pct, source_session_id, awarded_at)
select
  -- preserva o id LEGADO ('relic_123') quando existe — é o que G.equipment
  -- referencia; só gera um novo se por algum motivo a relíquia não tiver id.
  coalesce(r->>'id', gen_random_uuid()::text),
  slots.user_id, slots.slot_idx,
  r->>'itemId', r->>'rarity', coalesce((r->>'bonusPct')::numeric, 0),
  null, now()
from slots
cross join lateral jsonb_array_elements(coalesce(slots.slot_data->'relics', '[]'::jsonb)) as r
where r->>'itemId' is not null and r->>'rarity' is not null
on conflict (user_id, slot, id) do nothing;
