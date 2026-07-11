// Configuração do RTC (Rubinot Custom Client): ataque automático (spell OU
// runa, mutuamente exclusivos) e cura automática (spell E poção, cada uma
// com seu limiar de % de HP) — ver domain/rtcConfig.js e a UI em rtcPanel.js.
import { G } from './gameStore.js?v=30';
import { isSpellAvailable } from '../domain/spells.js?v=30';
import { emit, EVENTS } from '../shared/eventBus.js?v=30';
import { saveGame } from './saveGameUseCase.js?v=30';

function refresh(msg) {
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg, type: 'info' });
  saveGame();
}

export function setRtcAttackSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  const clearing = G.rtc.attackType === 'spell' && G.rtc.attackSpell === spellId;
  G.rtc.attackType = clearing ? null : 'spell';
  G.rtc.attackSpell = clearing ? null : spellId;
  G.rtc.attackRune = null;
  refresh(clearing ? 'Ataque automático removido.' : 'RTC vai castar essa magia automaticamente.');
}

export function setRtcAttackRune(itemId) {
  const clearing = G.rtc.attackType === 'rune' && G.rtc.attackRune === itemId;
  G.rtc.attackType = clearing ? null : 'rune';
  G.rtc.attackRune = clearing ? null : itemId;
  G.rtc.attackSpell = null;
  refresh(clearing ? 'Ataque automático removido.' : 'RTC vai usar essa runa automaticamente.');
}

export function setRtcHealSpell(spellId) {
  if (!isSpellAvailable(spellId, G.vocation, G.level)) return;
  G.rtc.healSpell = G.rtc.healSpell === spellId ? null : spellId;
  refresh(G.rtc.healSpell ? 'Spell de cura configurada.' : 'Spell de cura removida — voltando pra exura.');
}

export function setRtcHealPotion(itemId) {
  G.rtc.healPotion = G.rtc.healPotion === itemId ? null : itemId;
  refresh(G.rtc.healPotion ? 'Poção de cura configurada.' : 'Poção de cura removida.');
}

export function setRtcThreshold(field, value) {
  G.rtc[field] = Math.max(5, Math.min(95, Math.round(Number(value)) || 0));
  emit(EVENTS.RTC_PANEL);
  saveGame();
}
