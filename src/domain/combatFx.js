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
  // Munição física comum (sem elemento próprio) — usa o sprite genérico.
  arrow: 'arrow', arrow_weak: 'arrow', sniper_arrow: 'arrow', sniper_arrow_weak: 'arrow',
  simple_arrow: 'arrow', simple_arrow_weak: 'arrow', power_arrow: 'arrow',
  diamond_arrow: 'arrow', crystalline_arrow: 'arrow',
  bolt: 'bolt', bolt_weak: 'bolt', power_bolt: 'bolt', power_bolt_weak: 'bolt',
  piercing_bolt: 'bolt', piercing_bolt_weak: 'bolt', drill_bolt: 'bolt',
  // Elementais explícitas (nome já entrega o elemento real do Tibia).
  crystalline_arrow_fire: 'fire', flaming_arrow: 'fire', firestorm_arrow: 'fire',
  burst_arrow: 'fire', burst_arrow_weak: 'fire', infernal_bolt: 'fire',
  crystalline_arrow_ice: 'ice', froststorm_arrow: 'ice', shiver_arrow: 'ice',
  crystalline_arrow_energy: 'energy', flash_arrow: 'energy', thunderstorm_arrow: 'energy',
  vortex_bolt: 'energy',
  // "Terra" no Tibia cobre veneno/terra (sem categoria própria em elements.js).
  crystalline_arrow_earth: 'earth', earth_arrow: 'earth', envenomed_arrow: 'earth',
  poison_arrow: 'earth', tarsal_arrow: 'earth', terrastorm_arrow: 'earth',
  shatterstorm_arrow: 'earth', prismatic_bolt: 'earth',
  onyx_arrow: 'death', spectral_bolt: 'death',
};
const WAND_MISSILE = {
  wand_of_vortex: 'energy', wand_of_cosmic_energy: 'energy',
  wand_of_starstorm: 'energy', tempest_rod: 'energy', energized_limb: 'energy',
  falcon_rod: 'energy', falcon_wand: 'energy', shimmer_rod: 'energy', shimmer_wand: 'energy',
  wand_of_dimensions: 'energy', wand_of_might: 'energy', conjurer_wand: 'energy',
  yellow_spell_wand: 'energy', sorcerer_and_druid_staff: 'energy', sorcerer_test_weapon_test: 'energy',
  wand_of_destruction_test: 'death',

  wand_of_inferno: 'fire', dragonbone_staff: 'fire', wand_of_draconia: 'fire',
  volcanic_rod: 'fire', the_scorcher: 'fire', the_chiller: 'ice',
  draining_inferniarch_rod: 'fire', draining_inferniarch_wand: 'fire',
  inferniarch_rod: 'fire', inferniarch_wand: 'fire',
  rending_inferniarch_rod: 'fire', rending_inferniarch_wand: 'fire',
  siphoning_inferniarch_rod: 'fire', siphoning_inferniarch_wand: 'fire',
  ferumbras_staff_enchanted: 'fire', ferumbras_staff_failed: 'fire',
  lion_rod: 'fire', lion_wand: 'fire', red_spell_wand: 'fire',
  wand_of_dragonbreath: 'fire', wand_of_everblazing: 'fire',

  snakebite_rod: 'earth', wand_of_decay: 'earth', terra_rod: 'earth',
  springsprout_rod: 'earth', amber_rod: 'earth', amber_wand: 'earth',
  cobra_rod: 'earth', cobra_wand: 'earth', dream_blossom_staff: 'earth',
  jungle_rod: 'earth', jungle_wand: 'earth', muck_rod: 'earth', ogre_scepta: 'earth',
  quagmire_rod: 'earth', elven_wand: 'earth', green_spell_wand: 'earth',
  wooden_wand: 'earth', wand_of_plague: 'earth',
  // Fibulafeather quest: família "Carving" = físico (não há elemento próprio, mapeado como earth por padrão de terra/madeira entalhada).
  rod_of_carving: 'earth', rod_of_carving_charged: 'earth', rod_of_carving_heavily_charged: 'earth', rod_of_carving_overcharged: 'earth',
  plain_carving_rod: 'earth', valuable_carving_rod: 'earth', ornate_carving_rod: 'earth', gilded_eldritch_rod: 'death',
  wand_of_carving: 'earth', wand_of_carving_charged: 'earth', wand_of_carving_heavily_charged: 'earth', wand_of_carving_overcharged: 'earth',
  plain_carving_wand: 'earth', valuable_carving_wand: 'earth', ornate_carving_wand: 'earth',

  moonlight_rod: 'ice', hailstorm_rod: 'ice', glacial_rod: 'ice', northwind_rod: 'ice',
  naga_rod: 'ice', naga_wand: 'ice', deepling_ceremonial_dagger: 'ice', deepling_fork: 'ice',
  blue_spell_wand: 'ice',

  underworld_rod: 'death', skull_staff: 'death', wand_of_voodoo: 'death',
  wand_of_dementia: 'death', necrotic_rod: 'death', crypt_jaw: 'death', crypt_bile: 'death',
  eldritch_rod: 'death', eldritch_wand: 'death', gilded_eldritch_wand: 'death',
  grand_sanguine_rod: 'death', grand_sanguine_coil: 'death', sanguine_rod: 'death', sanguine_coil: 'death',
  rod_of_destruction: 'death', soulhexer: 'death', soultainter: 'death',
  wand_of_darkness: 'death', wand_of_destruction: 'death', ritual_wand: 'death',
  // Fibulafeather quest: família "Mayhem" = death (destruição).
  rod_of_mayhem: 'death', rod_of_mayhem_charged: 'death', rod_of_mayhem_heavily_charged: 'death', rod_of_mayhem_overcharged: 'death',
  plain_mayhem_rod: 'death', valuable_mayhem_rod: 'death', ornate_mayhem_rod: 'death',
  wand_of_mayhem: 'death', wand_of_mayhem_charged: 'death', wand_of_mayhem_heavily_charged: 'death', wand_of_mayhem_overcharged: 'death',
  plain_mayhem_wand: 'death', valuable_mayhem_wand: 'death', ornate_mayhem_wand: 'death',

  // Moonsilver = prata lunar sagrada; Fibulafeather "Remedy" = cura/holy.
  moonsilver_sceptre: 'holy', stellar_moonsilver_sceptre: 'holy',
  moonsilver_channeler: 'holy', stellar_moonsilver_channeler: 'holy',
  golden_wand: 'holy', wand_of_defiance: 'holy',
  rod_of_remedy: 'holy', rod_of_remedy_charged: 'holy', rod_of_remedy_heavily_charged: 'holy', rod_of_remedy_overcharged: 'holy',
  plain_remedy_rod: 'holy', valuable_remedy_rod: 'holy', ornate_remedy_rod: 'holy',
  wand_of_remedy: 'holy', wand_of_remedy_charged: 'holy', wand_of_remedy_heavily_charged: 'holy', wand_of_remedy_overcharged: 'holy',
  plain_remedy_wand: 'holy', valuable_remedy_wand: 'holy', ornate_remedy_wand: 'holy',
};
export function basicAttackMissile({ attackSkill, weaponId, ammoId } = {}) {
  if (attackSkill === 'distance') return AMMO_MISSILE[ammoId] || 'arrow';
  if (attackSkill === 'magic') return WAND_MISSILE[weaponId] || 'energy';
  return null; // corpo-a-corpo não dispara projétil
}
