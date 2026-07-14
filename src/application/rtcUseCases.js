// Configuração do RTC (Rubinot Custom Client): ataque automático (spell OU
// runa, mutuamente exclusivos) e cura automática (spell E poção, cada uma
// com seu limiar de % de HP) — ver domain/rtcConfig.js e a UI em rtcPanel.js.
import { G } from './gameStore.js?v=126';
import { isSpellAvailable } from '../domain/spells.js?v=126';
import { normalizeAttackSpells, canUseAttackRune, runeMinMl, ATTACK_SLOT_COUNT } from '../domain/rtcConfig.js?v=127';
import { getMagic } from './stats.js?v=125';
import { emit, EVENTS } from '../shared/eventBus.js?v=125';
import { saveGame } from './saveGameUseCase.js?v=126';
import { t } from '../i18n/i18n.js?v=135';

function refresh(msg) {
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg, type: 'info' });
  saveGame();
}

// Define a magia de uma caixinha de prioridade específica (idx = 0..ATTACK_SLOT_COUNT-1).
// Escolher magia desliga a runa (ataque é magias OU runa, como no RTC). Se a
// magia já estiver noutra caixinha, ela é removida de lá (sem duplicata).
export function setRtcAttackSpellSlot(idx, spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  const arr = Array.isArray(G.rtc.attackSpells) ? G.rtc.attackSpells.slice() : [];
  while (arr.length < ATTACK_SLOT_COUNT) arr.push(null);
  const dupIdx = arr.indexOf(spellId);
  if (dupIdx !== -1) arr[dupIdx] = null;
  arr[idx] = spellId;
  G.rtc.attackSpells = arr;
  G.rtc.attackType = 'spell';
  G.rtc.attackRune = null;
  refresh(t('rtc.spellAddedToPriority'));
}

// Esvazia uma caixinha de prioridade (idx = 0..ATTACK_SLOT_COUNT-1).
export function clearRtcAttackSpellSlot(idx) {
  const arr = Array.isArray(G.rtc.attackSpells) ? G.rtc.attackSpells.slice() : [];
  if (idx < arr.length) arr[idx] = null;
  G.rtc.attackSpells = arr;
  if (!arr.some(Boolean)) G.rtc.attackType = G.rtc.attackRune ? 'rune' : null;
  refresh(t('rtc.spellRemovedFromPriority'));
}

export function setRtcAttackRune(itemId) {
  const clearing = G.rtc.attackType === 'rune' && G.rtc.attackRune === itemId;
  // Magic Level mínimo pra usar a runa (fiel ao Tibia — ver domain/rtcConfig.js).
  if (!clearing && !canUseAttackRune(itemId, G.vocation, getMagic())) {
    emit(EVENTS.NOTIFY, { msg: t('rtc.insufficientMlForRune', { ml: runeMinMl(itemId) }), type: 'error' });
    return;
  }
  G.rtc.attackType = clearing ? null : 'rune';
  G.rtc.attackRune = clearing ? null : itemId;
  if (!clearing) G.rtc.attackSpells = []; // runa desliga as magias
  refresh(clearing ? t('rtc.autoAttackRemoved') : t('rtc.runeConfigured'));
}

// Prioridade inteligente por elemento: quando ligada, entre as magias PRONTAS
// da lista de prioridade, o RTC casta a mais forte contra a fraqueza da criatura
// atual (ver domain/elements.js + application/huntUseCases.js). Padrão: desligada.
export function setRtcSmartElement(on) {
  G.rtc.smartElement = !!on;
  refresh(G.rtc.smartElement ? t('rtc.smartElementOn') : t('rtc.smartElementOff'));
}

export function setRtcHealSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  G.rtc.healSpell = G.rtc.healSpell === spellId ? null : spellId;
  refresh(G.rtc.healSpell ? t('rtc.healSpellConfigured') : t('rtc.healSpellRemoved'));
}

// Define a poção do slot direto (arrastada da bag) — atribui, não alterna.
export function setRtcHealPotion(itemId) {
  G.rtc.healPotion = itemId;
  refresh(t('rtc.healPotionConfigured'));
}

export function setRtcManaPotion(itemId) {
  G.rtc.manaPotion = itemId;
  refresh(t('rtc.manaPotionConfigured'));
}

// Esvazia o slot de poção (clique no slot preenchido). kind = 'life' | 'mana'.
export function clearRtcPotion(kind) {
  if (kind === 'life') G.rtc.healPotion = null; else G.rtc.manaPotion = null;
  refresh(t('rtc.potionRemoved'));
}

export function setRtcThreshold(field, value) {
  G.rtc[field] = Math.max(5, Math.min(95, Math.round(Number(value)) || 0));
  emit(EVENTS.RTC_PANEL);
  saveGame();
}
