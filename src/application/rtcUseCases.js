// Configuração do RTC (Rubinot Custom Client): ataque automático (spell OU
// runa, mutuamente exclusivos) e cura automática (spell E poção, cada uma
// com seu limiar de % de HP) — ver domain/rtcConfig.js e a UI em rtcPanel.js.
import { G } from './gameStore.js?v=126';
import { isSpellAvailable } from '../domain/spells.js?v=125';
import { normalizeAttackSpells, canUseAttackRune, runeMinMl } from '../domain/rtcConfig.js?v=125';
import { getMagic } from './stats.js?v=125';
import { emit, EVENTS } from '../shared/eventBus.js?v=125';
import { saveGame } from './saveGameUseCase.js?v=126';
import { t } from '../i18n/i18n.js?v=131';

function refresh(msg) {
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg, type: 'info' });
  saveGame();
}

// Adiciona uma magia à lista de prioridade do ataque automático (no fim da
// fila). Escolher magias desliga a runa (ataque é magias OU runa, como no RTC).
export function addRtcAttackSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  const list = normalizeAttackSpells(G.rtc);
  if (list.includes(spellId)) return;
  G.rtc.attackSpells = [...list, spellId];
  G.rtc.attackType = 'spell';
  G.rtc.attackRune = null;
  refresh(t('rtc.spellAddedToPriority'));
}

export function removeRtcAttackSpell(spellId) {
  const list = normalizeAttackSpells(G.rtc).filter(id => id !== spellId);
  G.rtc.attackSpells = list;
  if (!list.length) G.rtc.attackType = G.rtc.attackRune ? 'rune' : null;
  refresh(t('rtc.spellRemovedFromPriority'));
}

// Sobe/desce uma magia na ordem de prioridade (dir = -1 sobe, +1 desce).
export function moveRtcAttackSpell(spellId, dir) {
  const list = normalizeAttackSpells(G.rtc);
  const i = list.indexOf(spellId);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  G.rtc.attackSpells = [...list];
  refresh(t('rtc.priorityUpdated'));
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
