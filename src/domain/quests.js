// Quests: raids com começo/meio/fim. Cada quest é uma sequência de ONDAS de
// criaturas reais do Tibia terminando num CHEFE; vencer o chefe concede UM
// prêmio real do Tibia, uma única vez (não repetível). Ver .spec/26-quests.
//
// Nada inventado: `waves`/`boss` são ids de MONSTERS (criaturas reais, no
// catálogo do cliente) e `reward.item` é um id de ITEMS (item real do Tibia,
// recompensa canônica de quest — Knight Armor, Crown Armor, Demon Armor...).
// A conclusão e o prêmio são autoritativos no servidor (ver huntEngine/index).
export const QUESTS = {
  orc_fortress: {
    id: 'orc_fortress', name: 'Orc Warlord\'s Fortress', icon: '🏰', recLevel: 20,
    desc: 'quest.desc.orcFortress',
    waves: [['orc', 'orc', 'orc'], ['orc', 'orc', 'orc', 'orc']],
    boss: 'orc_warlord',
    reward: { item: 'knight_armor' },
  },
  serpents_lair: {
    id: 'serpents_lair', name: 'The Serpent\'s Lair', icon: '🐍', recLevel: 45,
    desc: 'quest.desc.serpentsLair',
    waves: [['giant_spider'], ['giant_spider', 'giant_spider']],
    boss: 'hydra',
    reward: { item: 'crown_armor' },
  },
  demons_pact: {
    id: 'demons_pact', name: 'The Demon\'s Pact', icon: '😈', recLevel: 90,
    desc: 'quest.desc.demonsPact',
    waves: [['dragon_lord'], ['dragon_lord', 'dragon_lord']],
    boss: 'demon',
    reward: { item: 'demon_armor' },
  },
};

export const QUEST_IDS = Object.keys(QUESTS);

// Total de inimigos da raid (ondas + chefe) — pra barra de progresso.
export function questTotalEnemies(quest) {
  return (quest.waves || []).reduce((n, w) => n + w.length, 0) + 1;
}

// Sequência completa de ids de criatura da raid, em ordem (ondas depois o chefe).
export function questEnemySequence(quest) {
  return [...(quest.waves || []).flat(), quest.boss];
}

export function isQuestDone(completed, questId) {
  return Array.isArray(completed) && completed.includes(questId);
}
