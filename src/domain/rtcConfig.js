// Configuração do RTC (Rubinot Custom Client) — automação de combate, baseada
// no RTCaster real do RubinOT: uma forma de ataque automático (spell OU
// runa) e cura automática por spell E por poção, cada uma com seu próprio
// gatilho de % de HP (mesma estrutura das abas "RTCaster"/"Healing" do
// client real — ver .spec/14-spells-e-rtc.md).
// Runas de ataque por vocação — sem entrada aqui = livre pra todo mundo.
// Knight fica de fora de todas: sem investimento em magia, runa de ataque
// não rende dano nenhum (igual ao Tibia real, onde o dano da runa escala
// com Magic Level).
import { ITEMS } from './items.js?v=95';

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

// Magic Level mínimo pra usar a runa (fiel ao Tibia — runa forte exige mais ML).
export function runeMinMl(itemId) {
  return (ITEMS[itemId] && ITEMS[itemId].reqMl) || 0;
}
// Pode usar a runa de ataque? Precisa ser da vocação E ter o Magic Level mínimo.
export function canUseAttackRune(itemId, vocation, magicLevel) {
  return isRuneAvailableToVocation(itemId, vocation) && (magicLevel || 0) >= runeMinMl(itemId);
}

// Lista de magias de ataque em ordem de PRIORIDADE (como o RTCaster real, que
// deixa configurar várias e usa a primeira disponível). Migra saves antigos que
// tinham uma única `attackSpell`.
export function normalizeAttackSpells(rtc) {
  if (rtc && Array.isArray(rtc.attackSpells)) return rtc.attackSpells;
  return rtc && rtc.attackSpell ? [rtc.attackSpell] : [];
}

export function createDefaultRtc() {
  return {
    attackType: null,        // 'spell' | 'rune' | null
    attackSpells: [],        // ids das magias de ataque, em ordem de prioridade
    smartElement: false,     // casta a magia forte contra a fraqueza da criatura
    attackRune: null,
    healSpell: null,         // null = usa exura (cura básica) como padrão
    healSpellThreshold: 40,  // % de HP pra castar a spell de cura
    healPotion: null,
    healPotionThreshold: 25, // % de HP pra beber a poção (mais tardia, de emergência)
    manaPotion: null,
    manaPotionThreshold: 30, // % de mana pra beber a poção de mana (repor pra castar)
  };
}
