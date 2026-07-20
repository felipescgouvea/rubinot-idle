// Configuração do RTC (Rubinot Custom Client) — automação de combate, baseada
// no RTCaster real do RubinOT: UMA lista de prioridade de ataque que mistura
// magias E runas livremente (igual ao client real — lá dá pra colocar uma
// magia na caixinha 1 e uma runa na caixinha 2; o RTC usa a primeira PRONTA
// da lista, seja ela qual for) e cura automática por spell E por poção, cada
// uma com seu próprio gatilho de % de HP (ver .spec/14-spells-e-rtc.md).
// Runas de ataque por vocação — sem entrada aqui = livre pra todo mundo.
// Knight fica de fora de todas: sem investimento em magia, runa de ataque
// não rende dano nenhum (igual ao Tibia real, onde o dano da runa escala
// com Magic Level).
import { ITEMS } from './items.js?v=163';

const ATTACK_RUNE_VOCATIONS = {
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

// Quantidade de "caixinhas" de prioridade de ataque na UI (ver ui/rtcPanel.js:
// attackSpellSlot) — cada uma é um slot fixo (1ª a Nª prioridade), em vez de
// listar todas as magias disponíveis (ficava enorme com muitas magias).
export const ATTACK_SLOT_COUNT = 4;

// Cada caixinha da lista de prioridade guarda uma MAGIA (id puro, ex.:
// "exori") ou uma RUNA (id prefixado, ex.: "rune:fireball_rune") — o prefixo
// evita precisar de um objeto {type,id} só pra diferenciar, e mantém saves
// antigos (que só guardavam ids de magia) válidos sem migração.
const RUNE_PREFIX = 'rune:';
export function isRuneEntry(entry) {
  return typeof entry === 'string' && entry.startsWith(RUNE_PREFIX);
}
export function runeEntryId(entry) {
  return entry.slice(RUNE_PREFIX.length);
}
export function runeEntry(itemId) {
  return RUNE_PREFIX + itemId;
}

// Lista de magias/runas de ataque em ordem de PRIORIDADE (como o RTCaster
// real, que deixa configurar várias e usa a primeira PRONTA). Migra saves
// antigos: uma única `attackSpell`, ou uma runa configurada no antigo modo
// exclusivo `attackType: 'rune'` + `attackRune`. Filtra slots vazios (null)
// do modelo de caixinhas fixas — a ordem dos não-nulos é a prioridade real.
export function normalizeAttackSpells(rtc) {
  if (!rtc) return [];
  if (Array.isArray(rtc.attackSpells) && rtc.attackSpells.some(Boolean)) return rtc.attackSpells.filter(Boolean);
  if (rtc.attackSpell) return [rtc.attackSpell];
  if (rtc.attackType === 'rune' && rtc.attackRune) return [runeEntry(rtc.attackRune)];
  return [];
}

export function createDefaultRtc() {
  return {
    attackSpells: [],        // ids das magias/runas de ataque, em ordem de prioridade
    smartElement: false,     // casta a magia/runa forte contra a fraqueza da criatura
    healSpell: null,         // null = usa exura (cura básica) como padrão
    healSpellThreshold: 40,  // % de HP pra castar a spell de cura
    healPotion: null,
    healPotionThreshold: 25, // % de HP pra beber a poção (mais tardia, de emergência)
    manaPotion: null,
    manaPotionThreshold: 30, // % de mana pra beber a poção de mana (repor pra castar)
  };
}
