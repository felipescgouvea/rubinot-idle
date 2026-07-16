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
insert into public.player_equipment (user_id, slot, eq_slot, item_id, updated_at)
select
  slots.user_id, slots.slot_idx, eq.key,
  case when eq.value = 'null'::jsonb then null else trim(both '"' from eq.value::text) end,
  now()
from slots
cross join lateral jsonb_each(coalesce(slots.slot_data->'equipment', '{}'::jsonb)) as eq(key, value)
on conflict (user_id, slot, eq_slot) do nothing;

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
insert into public.player_skills (user_id, slot, skills, updated_at)
select
  slots.user_id, slots.slot_idx,
  jsonb_build_object(
    'magic', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'magic'->>'lv')::int, 0), 'tries', coalesce((slots.slot_data->'sk'->'magic'->>'tries')::numeric, 0)),
    'fist', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'fist'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'fist'->>'tries')::numeric, 0)),
    'club', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'club'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'club'->>'tries')::numeric, 0)),
    'sword', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'sword'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'sword'->>'tries')::numeric, 0)),
    'axe', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'axe'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'axe'->>'tries')::numeric, 0)),
    'distance', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'distance'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'distance'->>'tries')::numeric, 0)),
    'shielding', jsonb_build_object('lv', coalesce((slots.slot_data->'sk'->'shielding'->>'lv')::int, 10), 'tries', coalesce((slots.slot_data->'sk'->'shielding'->>'tries')::numeric, 0))
  ),
  now()
from slots
on conflict (user_id, slot) do nothing;
