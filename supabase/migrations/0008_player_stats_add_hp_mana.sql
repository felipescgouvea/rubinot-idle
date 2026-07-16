-- Marco 5: combate real (spells/runa/RTC) precisa de HP/mana persistidos
-- entre ticks — sem isso não dá pra saber se o jogador "morreu" ou precisa
-- de cura entre uma sessão de caça e outra.
alter table public.player_stats add column hp integer;
alter table public.player_stats add column mana integer;
