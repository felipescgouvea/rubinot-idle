// Configuração do RTC (Rubinot Custom Client): ataque automático (spell OU
// runa, mutuamente exclusivos) e cura automática (spell E poção, cada uma
// com seu limiar de % de HP) — ver domain/rtcConfig.js e a UI em rtcPanel.js.
import { G } from './gameStore.js?v=76';
import { isSpellAvailable } from '../domain/spells.js?v=76';
import { normalizeAttackSpells } from '../domain/rtcConfig.js?v=76';
import { emit, EVENTS } from '../shared/eventBus.js?v=76';
import { saveGame } from './saveGameUseCase.js?v=76';

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
  refresh('Magia adicionada à prioridade do ataque automático.');
}

export function removeRtcAttackSpell(spellId) {
  const list = normalizeAttackSpells(G.rtc).filter(id => id !== spellId);
  G.rtc.attackSpells = list;
  if (!list.length) G.rtc.attackType = G.rtc.attackRune ? 'rune' : null;
  refresh('Magia removida da prioridade.');
}

// Sobe/desce uma magia na ordem de prioridade (dir = -1 sobe, +1 desce).
export function moveRtcAttackSpell(spellId, dir) {
  const list = normalizeAttackSpells(G.rtc);
  const i = list.indexOf(spellId);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  G.rtc.attackSpells = [...list];
  refresh('Prioridade atualizada.');
}

export function setRtcAttackRune(itemId) {
  const clearing = G.rtc.attackType === 'rune' && G.rtc.attackRune === itemId;
  G.rtc.attackType = clearing ? null : 'rune';
  G.rtc.attackRune = clearing ? null : itemId;
  if (!clearing) G.rtc.attackSpells = []; // runa desliga as magias
  refresh(clearing ? 'Ataque automático removido.' : 'RTC vai usar essa runa automaticamente.');
}

export function setRtcHealSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  G.rtc.healSpell = G.rtc.healSpell === spellId ? null : spellId;
  refresh(G.rtc.healSpell ? 'Spell de cura configurada.' : 'Spell de cura removida — voltando pra exura.');
}

// Define a poção do slot direto (arrastada da bag) — atribui, não alterna.
export function setRtcHealPotion(itemId) {
  G.rtc.healPotion = itemId;
  refresh('Poção de vida configurada.');
}

export function setRtcManaPotion(itemId) {
  G.rtc.manaPotion = itemId;
  refresh('Poção de mana configurada.');
}

// Esvazia o slot de poção (clique no slot preenchido). kind = 'life' | 'mana'.
export function clearRtcPotion(kind) {
  if (kind === 'life') G.rtc.healPotion = null; else G.rtc.manaPotion = null;
  refresh('Poção removida do slot.');
}

export function setRtcThreshold(field, value) {
  G.rtc[field] = Math.max(5, Math.min(95, Math.round(Number(value)) || 0));
  emit(EVENTS.RTC_PANEL);
  saveGame();
}
