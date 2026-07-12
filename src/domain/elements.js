// Fraqueza/resistência elemental das criaturas — na lógica do Tibia: mortos-
// vivos sofrem com fogo/holy e resistem death/earth/ice; dragões resistem fogo
// e sofrem com gelo/terra; bichos de veneno resistem terra e sofrem com fogo/
// gelo; demônios resistem fogo/energia/death e sofrem com holy; etc.
//
// É uma aproximação temática (não os números exatos do CipSoft), agrupada por
// família pra cobrir as ~130 criaturas sem uma tabela gigante por bicho. O
// dano da magia/runa é multiplicado por esse modificador no combate; o ataque
// básico da arma conta como 'physical'. Ver application/huntUseCases.js.

export const ELEMENTS = ['physical', 'fire', 'ice', 'energy', 'earth', 'holy', 'death'];

const WEAK = 1.25;    // leva +25% do elemento
const RESIST = 0.7;   // leva -30%
const IMMUNE = 0;     // não sofre nada

// Cada família define quem sofre (weak), quem resiste (resist) e imunidades.
const FAMILIES = {
  undead: {
    weak: ['fire', 'holy'], resist: ['death', 'earth', 'ice'], immune: [],
    members: ['skeleton', 'ghoul', 'mummy', 'ghost', 'lich', 'undead_dragon', 'ghastly_dragon',
      'vampire', 'banshee', 'bonebeast', 'bonelord', 'crypt_shambler', 'crypt_defiler', 'braindeath',
      'betrayed_wraith', 'blightwalker', 'grim_reaper', 'priestess', 'pale_worm', 'soul_despoiler',
      'diblis', 'nightmare', 'nightmare_scion', 'feversleep', 'mutated_human', 'morgul', 'crypt_warrior'],
  },
  demon: {
    weak: ['holy'], resist: ['fire', 'energy', 'death'], immune: [],
    members: ['demon', 'juggernaut', 'dark_torturer', 'vexclaw', 'latrivan', 'ushuriel', 'madareth',
      'fury', 'hellfire_fighter', 'retching_horror', 'corrupted_one', 'furyosa'],
  },
  dragon: {
    weak: ['ice', 'earth'], resist: ['fire'], immune: [],
    members: ['dragon', 'dragon_lord', 'draptor', 'hellhound', 'efreet', 'plaguesmith',
      'draken_abomination', 'draken_warmaster', 'grorlam', 'zorvorax', 'hydra'],
  },
  frost: {
    weak: ['fire', 'energy'], resist: ['ice'], immune: [],
    members: ['frost_dragon', 'massive_water_elemental', 'marid', 'quara_pincher', 'quara_hydromancer'],
  },
  nature: {
    weak: ['fire', 'ice'], resist: ['earth'], immune: [],
    members: ['rotworm', 'carrion_worm', 'larva', 'centipede', 'scorpion', 'spider', 'giant_spider',
      'tarantula', 'poison_spider', 'wasp', 'bug', 'snake', 'cobra', 'serpent_spawn', 'medusa', 'slime',
      'wolf', 'bear', 'rat', 'cave_rat', 'bat', 'wyvern', 'werewolf', 'werelion', 'fleshcrawler', 'troll'],
  },
  golem: {
    weak: ['energy'], resist: ['earth', 'physical'], immune: [],
    members: ['stone_golem', 'war_golem'],
  },
  arcane: {
    weak: ['earth'], resist: ['energy'], immune: [],
    members: ['warlock'],
  },
};

// id da criatura -> nome da família (montado uma vez).
const MEMBER_FAMILY = {};
for (const [fam, data] of Object.entries(FAMILIES)) {
  data.members.forEach(id => { MEMBER_FAMILY[id] = fam; });
}

// Modificador de dano de um elemento contra uma criatura (1 = neutro).
export function elementMod(monsterId, element) {
  const fam = FAMILIES[MEMBER_FAMILY[monsterId]];
  if (!fam || !element) return 1;
  if (fam.immune.includes(element)) return IMMUNE;
  if (fam.weak.includes(element)) return WEAK;
  if (fam.resist.includes(element)) return RESIST;
  return 1;
}

// Pra UI (Bestiário): listas de elementos fracos/resistidos/imunes da criatura.
export function monsterElementProfile(monsterId) {
  const fam = FAMILIES[MEMBER_FAMILY[monsterId]];
  if (!fam) return { weak: [], resist: [], immune: [] };
  return { weak: [...fam.weak], resist: [...fam.resist], immune: [...fam.immune] };
}

// Ícone/emoji por elemento pra exibição compacta.
export const ELEMENT_ICON = {
  physical: '⚔️', fire: '🔥', ice: '❄️', energy: '⚡', earth: '🍃', holy: '✨', death: '💀',
};
export const ELEMENT_LABEL = {
  physical: 'Físico', fire: 'Fogo', ice: 'Gelo', energy: 'Energia', earth: 'Terra', holy: 'Sagrado', death: 'Morte',
};
