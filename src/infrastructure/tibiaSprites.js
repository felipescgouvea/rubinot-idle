// Construção de caminhos de sprite. Todas as sprites foram baixadas do
// TibiaWiki e são servidas localmente (assets/sprites/), pra não depender da
// disponibilidade do CDN externo em tempo de jogo — ver .spec/90-regras-de-negocio-gerais.md.
// O nome do arquivo ainda segue a convenção do TibiaWiki (histórico de onde veio),
// mas o conteúdo real baixado é WebP; todo consumidor mantém fallback gracioso
// pro ícone (ver ui/*, o onerror da <img>) pra qualquer sprite que não exista localmente.

export const SPRITE_BASE = 'assets/sprites/';

function localName(file) {
  return file.replace(/\.[^.]+$/, '.webp');
}

// bosses exclusivos do RubinOT não existem no Tibia — usam sprites temáticos
export const SPRITE_OVERRIDE = {
  lothlorien: 'Elf_Arcanist.gif',
  executioner: 'Orc_Warlord.gif',
  morgul: 'Spectre.gif',
  corrupted_one: 'Blightwalker.gif',
  nzoth: 'World_Devourer.gif',
};

// ?sv (sprite version) força o navegador a re-baixar quando o CONTEÚDO dos
// sprites de monstro muda mantendo o nome do arquivo (ex.: normalização de
// enquadramento — recorte do transparente + re-quadrado). Bumpe ao reprocessar.
const MONSTER_SPRITE_VER = 1;
export function monsterSpriteFile(monsterId, monster) {
  const file = SPRITE_OVERRIDE[monsterId] || (monster.name.replace(/ /g, '_') + '.gif');
  return 'monsters/' + localName(file) + '?sv=' + MONSTER_SPRITE_VER;
}

// Itens cujo id não deriva o nome real do arquivo no TibiaWiki (o id ficou
// em inglês mas diferente do nome oficial do item).
const ITEM_SPRITE_OVERRIDE = {
  worm_dirt: 'Lump_of_Dirt.gif',
  // "Dragon Scale" é uma página de desambiguação no TibiaWiki (não existe um
  // item genérico "Dragon Scale") — a variante correspondente ao drop do
  // Dragon comum é a "Green Dragon Scale".
  dragon_scale: 'Green_Dragon_Scale.gif',
  // "Robe" também não existe como item genérico — só variantes nomeadas
  // (Red Robe, Purple Robe, etc.). Red Robe é a mais antiga/reconhecível.
  robe: 'Red_Robe.gif',
};

// Toda entrada de ITEMS usa um id em inglês (mesmo quando o "name" exibido ao
// jogador está em português) — então dá pra derivar o nome de arquivo do
// TibiaWiki diretamente do id, sem precisar de uma tabela manual por item.
// Preposições curtas ficam minúsculas (convenção do wiki: "Boots_of_Haste.gif").
const LOWERCASE_WORDS = new Set(['of', 'the', 'and']);
function idToTibiaFilename(id) {
  return id.split('_')
    .map((word, i) => (i > 0 && LOWERCASE_WORDS.has(word)) ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('_') + '.gif';
}

export function itemSpriteFile(itemId) {
  const file = ITEM_SPRITE_OVERRIDE[itemId] || idToTibiaFilename(itemId);
  return 'items/' + localName(file);
}

export function spriteUrl(file) {
  return SPRITE_BASE + file;
}

// Ícones de skill: arquivo real do Tibia (nome não deriva do id da skill,
// por isso é uma tabela em vez de convenção — ver domain/character.js).
const SKILL_ICON_FILES = {
  magic: 'Magic_Level_Icon.png',
  fist: 'Fist_Fighting_Icon.png',
  club: 'Club_Fighting_Icon.png',
  sword: 'Sword_Fighting_Icon.png',
  axe: 'Axe_Fighting_Icon.png',
  distance: 'Distance_Fighting_Icon.png',
  shielding: 'Shielding_Icon.png',
};
export function skillIconFile(skillId) {
  return 'skills/' + localName(SKILL_ICON_FILES[skillId]);
}

// Ícone de magia: cada spell tem sua própria sprite no TibiaWiki, nomeada
// pelo nome em inglês da magia (ex.: "Light Healing" -> Light_Healing.gif).
export function spellIconFile(spellName) {
  return 'spells/' + localName(spellName.replace(/ /g, '_') + '.gif');
}

// Vitais do personagem (HP/Mana/XP) — sprites reais da janela de status do Tibia.
export const VITAL_ICON_FILES = {
  hp: 'vitals/Hit_Points_Icon.webp',
  mana: 'vitals/Mana_Icon.webp',
  xp: 'vitals/Experience_Icon.webp',
};

// Efeitos de magia/runa: gifs REAIS de efeito do Tibia (Fire/Energy/Ice/Holy/
// Explosion/Death/Earth), mantidos ANIMADOS (.gif, não achatados pra webp) pra
// a animação tocar na cena de batalha quando uma magia/runa é castada. O
// elemento vem de domain/spells.js (element) e das runas (domain/items.js).
// 'arcane' (golpe básico do mago) reaproveita o efeito de energia.
const EFFECT_ELEMENT_FILE = {
  fire: 'fire.gif',
  energy: 'energy.gif',
  arcane: 'energy.gif',
  ice: 'ice.gif',
  holy: 'holy.gif',
  physical: 'physical.gif',
  death: 'death.gif',
  earth: 'earth.gif',
};
export function effectSpriteFile(element) {
  const f = EFFECT_ELEMENT_FILE[element];
  return f ? 'effects/' + f : null;
}

// Moedas: Gold Coin é item real (ver domain/items.js: gold_coin). Rubini Coin
// é moeda premium exclusiva deste jogo idle — não existe em Tibia/RubinOT,
// então usa a sprite real mais próxima em conceito (Tibia Coin, a moeda
// premium oficial) em vez de um emoji genérico.
export const RUBINI_COIN_FILE = 'currency/Tibia_Coin.webp';
