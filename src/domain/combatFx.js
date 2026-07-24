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
  explosion_rune: 'physical', desintegrate_rune: 'physical',
  avalanche_rune: 'ice', icicle_rune: 'ice',
  fireball_rune: 'fire', great_fireball_rune: 'fire', soulfire_rune: 'fire',
  fire_bomb_rune: 'fire', fire_field_rune: 'fire', fire_wall_rune: 'fire',
  light_magic_missile_rune: 'energy', heavy_magic_missile_rune: 'energy',
  lightest_missile_rune: 'energy', thunderstorm_rune: 'energy',
  energy_bomb_rune: 'energy', energy_field_rune: 'energy', energy_wall_rune: 'energy',
  stalagmite_rune: 'earth', stone_shower_rune: 'earth', light_stone_shower_rune: 'earth',
  poison_bomb_rune: 'earth', poison_field_rune: 'earth', poison_wall_rune: 'earth',
  holy_missile_rune: 'holy',
};

// Magias que no Tibia real VOAM do personagem até o alvo (um projétil físico
// de verdade, igual ao golpe básico à distância) em vez de só "explodir" um
// efeito estático em cima do alvo — hoje só as duas Ethereal Spear do
// paladino (CONST_ANI_SPEAR: literalmente joga uma lança). Sem isso elas
// caíam no fallback de ELEMENT_EFFECT (physical) e mostravam o efeito de
// "estouro físico" parado no monstro, nunca uma lança voando (bug reportado
// pelo Felipe: "magias de paladin estao com projetil errado").
const SPELL_MISSILE = {
  // Fogo
  exori_flam: 'fire', exori_gran_flam: 'fire', exori_max_flam: 'fire',
  exori_min_flam: 'fire', utori_flam: 'fire',
  // Energia
  exori_vis: 'energy', exori_gran_vis: 'energy', exori_max_vis: 'energy',
  exevo_vis_hur: 'energy', exori_amp_vis: 'energy', utori_vis: 'energy', buzz: 'energy',
  // Gelo (CONST_ANI_SMALLICE)
  exori_frigo: 'ice', exori_gran_frigo: 'ice', exori_max_frigo: 'ice',
  // Terra (CONST_ANI_SMALLEARTH)
  exori_tera: 'earth', exori_gran_tera: 'earth', exori_max_tera: 'earth',
  mud_attack: 'earth', utori_pox: 'earth',
  // Morte
  exori_mort: 'death', utori_mort: 'death',
  // Sagrado (CONST_ANI_SMALLHOLY)
  exori_san: 'holy', utori_san: 'holy',
  // Lança de verdade (CONST_ANI_ETHEREALSPEAR)
  exori_con: 'spear', exori_gran_con: 'spear',
};

// Runas que VOAM do personagem até o alvo, com o sprite de cada uma. Mesma
// fonte: o CONST_ANI_* de data/scripts/spells/attack/*_rune.lua no Crystal Server.
const RUNE_MISSILE = {
  sudden_death_rune: 'death',
  avalanche_rune: 'ice', icicle_rune: 'ice',
  fireball_rune: 'fire', great_fireball_rune: 'fire', soulfire_rune: 'fire',
  fire_bomb_rune: 'fire', fire_field_rune: 'fire', fire_wall_rune: 'fire',
  light_magic_missile_rune: 'energy', heavy_magic_missile_rune: 'energy',
  lightest_missile_rune: 'energy', thunderstorm_rune: 'energy',
  energy_bomb_rune: 'energy', energy_field_rune: 'energy', energy_wall_rune: 'energy',
  poison_bomb_rune: 'energy', poison_field_rune: 'energy', poison_wall_rune: 'energy',
  magic_wall_rune: 'energy', wild_growth_rune: 'energy',
  stalagmite_rune: 'earth', stone_shower_rune: 'earth', light_stone_shower_rune: 'earth',
  holy_missile_rune: 'holy',
};

export function runeMissileName(runeId) {
  return RUNE_MISSILE[runeId] || null;
}

export function spellMissileName(spellId) {
  return SPELL_MISSILE[spellId] || null;
}

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
// Cada munição tem projétil PRÓPRIO no Tibia — o items.xml do Crystal Server dá o
// shootType de cada uma (arrow, burstarrow, onyxarrow, spectralbolt...), 21
// distintos. Os sprites vêm do TibiaWiki (<Nome>_Missile.gif) via
// scripts/fetch-missiles.mjs e ficam em assets/sprites/missiles/<id do item>.
// Por isso não há tabela aqui: o id da munição JÁ é o nome do arquivo.
//
// A única exceção é a Crystal Bolt, que não tem sprite de projétil no wiki —
// cai no genérico, e isso está registrado no relatório do script em vez de ser
// mascarado por um sprite parecido.
const AMMO_SEM_SPRITE = { crystal_bolt: 'bolt' };
// Projétil (shootType) de cada wand/rod = valor REAL do Crystal Server
// (reference/crystalserver/data/items/items.xml, atributo shootType). Os
// shootTypes smallice/smallearth/suddendeath colapsam em ice/earth/death (só
// temos 1 sprite por elemento). Auditoria 2026-07-24: 38 itens estavam errados
// (famílias Inferniarch, Sanguine, Eldritch inteiras) — corrigidos aqui.
// Itens SEM shootType no CS (custom/quest: carving/mayhem/remedy, moonsilver,
// spell wands, dragonbone/skull staff) não têm fonte — mantidos como estavam,
// marcados "(sem fonte CS)". Nenhuma wand do CS dispara holy.
const WAND_MISSILE = {
  // --- ENERGY ---
  wand_of_vortex: 'energy', wand_of_cosmic_energy: 'energy', wand_of_starstorm: 'energy',
  falcon_wand: 'energy', shimmer_wand: 'energy', wand_of_dimensions: 'energy',
  sorcerer_and_druid_staff: 'energy', amber_wand: 'energy', cobra_wand: 'energy',
  dream_blossom_staff: 'energy', crypt_bile: 'energy', grand_sanguine_coil: 'energy',
  sanguine_coil: 'energy', naga_wand: 'energy', wand_of_destruction: 'energy',
  wand_of_dementia: 'energy', wand_of_defiance: 'energy',
  ferumbras_staff_enchanted: 'energy', ferumbras_staff_failed: 'energy',
  tempest_rod: 'energy', wand_of_might: 'energy', conjurer_wand: 'energy', // (sem fonte CS)
  yellow_spell_wand: 'energy', sorcerer_test_weapon_test: 'energy', // (sem fonte CS)

  // --- FIRE ---
  wand_of_inferno: 'fire', wand_of_draconia: 'fire', wand_of_dragonbreath: 'fire',
  wand_of_everblazing: 'fire', the_scorcher: 'fire',
  energized_limb: 'fire', eldritch_wand: 'fire', gilded_eldritch_wand: 'fire',
  dragonbone_staff: 'fire', volcanic_rod: 'fire', red_spell_wand: 'fire', // (sem fonte CS)

  // --- EARTH (smallearth colapsa aqui) ---
  snakebite_rod: 'earth', terra_rod: 'earth', springsprout_rod: 'earth', cobra_rod: 'earth',
  jungle_wand: 'earth', muck_rod: 'earth', ogre_scepta: 'earth',
  falcon_rod: 'earth', crypt_jaw: 'earth', inferniarch_rod: 'earth',
  draining_inferniarch_rod: 'earth', rending_inferniarch_rod: 'earth', siphoning_inferniarch_rod: 'earth',
  grand_sanguine_rod: 'earth', sanguine_rod: 'earth',
  quagmire_rod: 'earth', elven_wand: 'earth', green_spell_wand: 'earth', // (sem fonte CS)
  wooden_wand: 'earth', wand_of_plague: 'earth', // (sem fonte CS)
  // Fibulafeather "Carving" = físico, sem elemento no CS — mantido earth por convenção.
  rod_of_carving: 'earth', rod_of_carving_charged: 'earth', rod_of_carving_heavily_charged: 'earth', rod_of_carving_overcharged: 'earth',
  plain_carving_rod: 'earth', valuable_carving_rod: 'earth', ornate_carving_rod: 'earth',
  wand_of_carving: 'earth', wand_of_carving_charged: 'earth', wand_of_carving_heavily_charged: 'earth', wand_of_carving_overcharged: 'earth',
  plain_carving_wand: 'earth', valuable_carving_wand: 'earth', ornate_carving_wand: 'earth',

  // --- ICE (smallice colapsa aqui) ---
  moonlight_rod: 'ice', hailstorm_rod: 'ice', glacial_rod: 'ice', northwind_rod: 'ice',
  naga_rod: 'ice', deepling_ceremonial_dagger: 'ice', deepling_fork: 'ice', the_chiller: 'ice',
  amber_rod: 'ice', jungle_rod: 'ice', lion_rod: 'ice', lion_wand: 'ice',
  eldritch_rod: 'ice', gilded_eldritch_rod: 'ice', rod_of_destruction: 'ice',
  shimmer_rod: 'ice', soulhexer: 'ice',
  blue_spell_wand: 'ice', // (sem fonte CS)

  // --- DEATH (suddendeath colapsa aqui) ---
  underworld_rod: 'death', wand_of_voodoo: 'death', necrotic_rod: 'death',
  wand_of_darkness: 'death', soultainter: 'death',
  wand_of_decay: 'death', inferniarch_wand: 'death', draining_inferniarch_wand: 'death',
  rending_inferniarch_wand: 'death', siphoning_inferniarch_wand: 'death',
  skull_staff: 'death', ritual_wand: 'death', wand_of_destruction_test: 'death', // (sem fonte CS / teste)
  // Fibulafeather "Mayhem" = destruição, sem elemento no CS — mantido death por convenção.
  rod_of_mayhem: 'death', rod_of_mayhem_charged: 'death', rod_of_mayhem_heavily_charged: 'death', rod_of_mayhem_overcharged: 'death',
  plain_mayhem_rod: 'death', valuable_mayhem_rod: 'death', ornate_mayhem_rod: 'death',
  wand_of_mayhem: 'death', wand_of_mayhem_charged: 'death', wand_of_mayhem_heavily_charged: 'death', wand_of_mayhem_overcharged: 'death',
  plain_mayhem_wand: 'death', valuable_mayhem_wand: 'death', ornate_mayhem_wand: 'death',

  // --- HOLY: nenhuma wand do CS dispara holy; estes não têm fonte, mantidos como estavam.
  moonsilver_sceptre: 'holy', stellar_moonsilver_sceptre: 'holy',
  moonsilver_channeler: 'holy', stellar_moonsilver_channeler: 'holy',
  golden_wand: 'holy',
  rod_of_remedy: 'holy', rod_of_remedy_charged: 'holy', rod_of_remedy_heavily_charged: 'holy', rod_of_remedy_overcharged: 'holy',
  plain_remedy_rod: 'holy', valuable_remedy_rod: 'holy', ornate_remedy_rod: 'holy',
  wand_of_remedy: 'holy', wand_of_remedy_charged: 'holy', wand_of_remedy_heavily_charged: 'holy', wand_of_remedy_overcharged: 'holy',
  plain_remedy_wand: 'holy', valuable_remedy_wand: 'holy', ornate_remedy_wand: 'holy',
};
export function basicAttackMissile({ attackSkill, weaponId, ammoId } = {}) {
  if (attackSkill === 'distance') return AMMO_SEM_SPRITE[ammoId] || ammoId || 'arrow';
  if (attackSkill === 'magic') return WAND_MISSILE[weaponId] || 'energy';
  return null; // corpo-a-corpo não dispara projétil
}
