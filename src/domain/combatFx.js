// Efeitos visuais de combate FIÉIS ao Tibia: cada magia/runa/munição tem um
// efeito de IMPACTO específico (a animação que aparece sobre o alvo) e, quando
// é um ataque à distância, um PROJÉTIL que voa do personagem até o monstro
// antes do impacto. Isso substitui o antigo mapa genérico "por elemento" —
// aqui cada spell aponta pro efeito real dela no jogo.
//
// impact  -> nome do gif em assets/sprites/effects/<impact>.gif (animado)
// missile -> nome do gif em assets/sprites/missiles/<missile>.gif (voa até o alvo)
//            ausente = ataque instantâneo/corpo-a-corpo (sem projétil).
//
// Strikes (exori flam/vis/frigo…) no Tibia são instantâneos no alvo: só
// impacto, sem projétil. Só spells/runas/munições realmente "de arremesso"
// ganham missile (Ethereal Spear, Divine Missile, Sudden Death, flechas…).

const MELEE = { impact: 'blood' };            // golpe físico corpo-a-corpo (sem projétil)
const ARCANE = { impact: 'energy', missile: 'energy' }; // tiro básico de wand do mago

export const SPELL_FX = {
  // knight — área corpo-a-corpo, sem projétil
  exori:            { impact: 'physical' },
  exori_mas:        { impact: 'groundshaker' },
  exori_gran:       { impact: 'physical' },
  // paladin — arremessos e área sagrada
  exori_con:        { impact: 'blood', missile: 'spear' },   // Ethereal Spear
  exori_san:        { impact: 'holy',  missile: 'holy' },    // Divine Missile
  exevo_mas_san:    { impact: 'holy' },                      // Divine Caldera (área ao redor)
  // sorcerer — strikes instantâneos + waves + Hell's Core
  exori_flam:       { impact: 'fire' },
  exevo_flam_hur:   { impact: 'fire' },
  exori_vis:        { impact: 'energy' },
  exevo_vis_hur:    { impact: 'energy' },
  exori_gran_vis:   { impact: 'energy' },
  exevo_gran_mas_vis:{ impact: 'fire' },                     // Hell's Core = fogo
  // druid — gelo/terra
  exori_frigo:      { impact: 'ice' },
  exevo_frigo_hur:  { impact: 'ice' },
  exevo_tera_hur:   { impact: 'earth' },
  exori_gran_frigo: { impact: 'ice' },
  exevo_gran_mas_frio:{ impact: 'ice' },                     // Eternal Winter
};

// Runas de ataque — SD arremessa a Death Missile; as demais explodem no alvo.
export const RUNE_FX = {
  sudden_death_rune:   { impact: 'death', missile: 'death' },
  explosion_rune:      { impact: 'physical' },
  avalanche_rune:      { impact: 'ice' },
  fireball_rune:       { impact: 'fire' },
  great_fireball_rune: { impact: 'fire' },
};

// Munição do paladino (ataque básico à distância) — a flecha/bolt voa até o
// alvo e o impacto é físico (sangue).
export const AMMO_FX = {
  arrow:        { impact: 'blood', missile: 'arrow' },
  bolt:         { impact: 'blood', missile: 'bolt' },
  sniper_arrow: { impact: 'blood', missile: 'arrow' },
  power_bolt:   { impact: 'blood', missile: 'bolt' },
};

export function fxForSpell(spellId) { return SPELL_FX[spellId] || MELEE; }
export function fxForRune(runeId)   { return RUNE_FX[runeId]   || { impact: 'physical' }; }
export function fxForAmmo(ammoId)   { return AMMO_FX[ammoId]   || { impact: 'blood', missile: 'arrow' }; }
export const meleeFx = () => MELEE;
export const arcaneFx = () => ARCANE;
