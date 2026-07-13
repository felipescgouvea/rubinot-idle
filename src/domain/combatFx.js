// Nome do sprite de EFEITO real (assets/sprites/effects/<nome>.gif) de cada
// magia/runa — o mesmo que o Tibia toca no chão sobre a área atingida. A UI
// espalha esse sprite nos tiles ao redor do personagem seguindo a FORMA da
// área da magia (spell.area / rune.area) — ver ui/huntPanel.js: playAreaEffect.
//
// A maioria segue o elemento (fogo/energia/gelo/…); alguns têm efeito próprio
// no jogo (ex.: Groundshaker = o abalo de pedras marrom, não um "físico"
// genérico) e por isso têm override específico.

const ELEMENT_EFFECT = {
  fire: 'fire',
  energy: 'energy',
  ice: 'ice',
  holy: 'holy',
  earth: 'earth',
  physical: 'physical',
  death: 'death',
};

// Magias com efeito visual próprio no Tibia (diferente do "por elemento").
const SPELL_EFFECT_OVERRIDE = {
  exori: 'hitarea',                // Berserk — CONST_ME_HITAREA (redemoinho branco, não sangue)
  exori_gran: 'hitarea',           // Fierce Berserk — mesmo CONST_ME_HITAREA do Berserk
  exori_ico: 'hitarea',            // Brutal Strike — CONST_ME_HITAREA
  exori_hur: 'hitarea',            // Whirlwind Throw — CONST_ME_HITAREA
  exori_min: 'hitarea',            // Front Sweep — CONST_ME_HITAREA
  exori_gran_ico: 'hitarea',       // Annihilation — CONST_ME_HITAREA
  exori_mas: 'groundshaker',       // Groundshaker — abalo de pedras no chão
};

const RUNE_EFFECT = {
  sudden_death_rune: 'death',
  explosion_rune: 'physical',
  avalanche_rune: 'ice',
  fireball_rune: 'fire',
  great_fireball_rune: 'fire',
};

export function spellEffectName(spellId, element) {
  return SPELL_EFFECT_OVERRIDE[spellId] || ELEMENT_EFFECT[element] || 'physical';
}
export function runeEffectName(runeId) {
  return RUNE_EFFECT[runeId] || 'physical';
}

// Projétil do GOLPE BÁSICO à distância/mágico — o que voa do personagem até o
// alvo (ver ui/huntPanel.js: playProjectile). Só arco (paladino) e wand/rod
// (mago) disparam; corpo-a-corpo (cavaleiro) não tem projétil (retorna null).
//  - distance: a própria munição equipada (flecha/virote); sem munição, flecha.
//  - magic: o "raio" elemental da wand/rod (energia/fogo/gelo/terra/morte).
const AMMO_MISSILE = {
  arrow: 'arrow', sniper_arrow: 'arrow',
  bolt: 'bolt', power_bolt: 'bolt',
};
const WAND_MISSILE = {
  wand_of_vortex: 'energy', wand_of_cosmic_energy: 'energy',
  wand_of_inferno: 'fire', dragonbone_staff: 'fire',
  snakebite_rod: 'earth',
  moonlight_rod: 'ice',
  underworld_rod: 'death', skull_staff: 'death',
};
export function basicAttackMissile({ attackSkill, weaponId, ammoId } = {}) {
  if (attackSkill === 'distance') return AMMO_MISSILE[ammoId] || 'arrow';
  if (attackSkill === 'magic') return WAND_MISSILE[weaponId] || 'energy';
  return null; // corpo-a-corpo não dispara projétil
}
