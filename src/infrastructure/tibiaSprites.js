// Construção de URLs de sprite a partir do TibiaWiki. "Infraestrutura" porque
// é acoplamento com um serviço externo (nome de arquivo por convenção,
// disponibilidade não garantida) — por isso todo consumidor tem fallback
// gracioso pro ícone (ver ui/*, o onerror da <img>).

export const SPRITE_BASE = 'https://tibia.fandom.com/wiki/Special:FilePath/';

// bosses exclusivos do RubinOT não existem no Tibia — usam sprites temáticos
export const SPRITE_OVERRIDE = {
  lothlorien: 'Elf_Arcanist.gif',
  executioner: 'Orc_Warlord.gif',
  morgul: 'Spectre.gif',
  corrupted_one: 'Blightwalker.gif',
  nzoth: 'World_Devourer.gif',
};

export function monsterSpriteFile(monsterId, monster) {
  return SPRITE_OVERRIDE[monsterId] || (monster.name.replace(/ /g, '_') + '.gif');
}

// Itens cujo id não deriva o nome real do arquivo no TibiaWiki (o id ficou
// em inglês mas diferente do nome oficial do item).
const ITEM_SPRITE_OVERRIDE = {
  worm_dirt: 'Lump_of_Dirt.gif',
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
  return ITEM_SPRITE_OVERRIDE[itemId] || idToTibiaFilename(itemId);
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
  return SKILL_ICON_FILES[skillId];
}

// Ícone de magia: cada spell tem sua própria sprite no TibiaWiki, nomeada
// pelo nome em inglês da magia (ex.: "Light Healing" -> Light_Healing.gif).
export function spellIconFile(spellName) {
  return spellName.replace(/ /g, '_') + '.gif';
}

// Vitais do personagem (HP/Mana/XP) — sprites reais da janela de status do Tibia.
export const VITAL_ICON_FILES = {
  hp: 'Hit_Points_Icon.gif',
  mana: 'Mana_Icon.gif',
  xp: 'Experience_Icon.gif',
};

// Moedas: Gold Coin é item real (ver domain/items.js: gold_coin). Rubini Coin
// é moeda premium exclusiva deste jogo idle — não existe em Tibia/RubinOT,
// então usa a sprite real mais próxima em conceito (Tibia Coin, a moeda
// premium oficial) em vez de um emoji genérico.
export const RUBINI_COIN_FILE = 'Tibia_Coin.gif';
