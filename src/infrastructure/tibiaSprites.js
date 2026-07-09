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

// Melhor esforço: página da vocação no TibiaWiki. Sem sucesso, cai no ícone
// (mesmo tratamento do SPRITE_OVERRIDE acima).
export const VOCATION_SPRITE = { knight: 'Knight.gif', paladin: 'Paladin.gif', sorcerer: 'Sorcerer.gif', druid: 'Druid.gif' };

export function monsterSpriteFile(monsterId, monster) {
  return SPRITE_OVERRIDE[monsterId] || (monster.name.replace(/ /g, '_') + '.gif');
}

export function spriteUrl(file) {
  return SPRITE_BASE + file;
}
