-- Fecha as duas últimas limitações documentadas em server/src/huntEngine.js:
-- bênçãos e stamina passam a ser autoritativas (antes: tratadas como
-- zero/sempre cheia, nunca dando vantagem indevida, mas também nunca
-- refletindo o que o jogador realmente tem).
alter table public.player_stats add column blessings integer not null default 0;
alter table public.player_stats add column stamina numeric not null default 2520;

update public.player_stats ps
set
  blessings = coalesce((
    select (case when jsonb_typeof(s.data->'slots') = 'array' then s.data->'slots'->ps.slot else s.data end ->> 'blessings')::int
    from public.saves s where s.user_id = ps.user_id
  ), 0),
  stamina = coalesce((
    select (case when jsonb_typeof(s.data->'slots') = 'array' then s.data->'slots'->ps.slot else s.data end ->> 'stamina')::numeric
    from public.saves s where s.user_id = ps.user_id
  ), 2520);
