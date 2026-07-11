// Configuração do RTC (Rubinot Custom Client) — automação de combate, baseada
// no RTCaster real do RubinOT: uma forma de ataque automático (spell OU
// runa) e cura automática por spell E por poção, cada uma com seu próprio
// gatilho de % de HP (mesma estrutura das abas "RTCaster"/"Healing" do
// client real — ver .spec/14-spells-e-rtc.md).
// Runas de ataque por vocação — sem entrada aqui = livre pra todo mundo.
// Knight fica de fora de todas: sem investimento em magia, runa de ataque
// não rende dano nenhum (igual ao Tibia real, onde o dano da runa escala
// com Magic Level).
export const ATTACK_RUNE_VOCATIONS = {
  sudden_death_rune: ['paladin', 'sorcerer', 'druid'],
  explosion_rune: ['paladin', 'sorcerer', 'druid'],
  avalanche_rune: ['paladin', 'sorcerer', 'druid'],
  fireball_rune: ['paladin', 'sorcerer', 'druid'],
  great_fireball_rune: ['paladin', 'sorcerer', 'druid'],
};

export function isRuneAvailableToVocation(itemId, vocation) {
  const vocs = ATTACK_RUNE_VOCATIONS[itemId];
  return !vocs || vocs.includes(vocation);
}

export function createDefaultRtc() {
  return {
    attackType: null,        // 'spell' | 'rune' | null
    attackSpell: null,
    attackRune: null,
    healSpell: null,         // null = usa exura (cura básica) como padrão
    healSpellThreshold: 40,  // % de HP pra castar a spell de cura
    healPotion: null,
    healPotionThreshold: 25, // % de HP pra beber a poção (mais tardia, de emergência)
  };
}
