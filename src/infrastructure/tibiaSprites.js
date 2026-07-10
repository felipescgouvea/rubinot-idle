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
