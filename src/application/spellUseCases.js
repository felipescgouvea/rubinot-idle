import { G } from './gameStore.js';
import { SPELLS, isSpellAvailable } from '../domain/spells.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { saveGame } from './saveGameUseCase.js';

export function selectSpell(id) {
  const s = SPELLS[id];
  if (!s || !isSpellAvailable(id, G.vocation, G.level)) return;
  const slot = s.type; // 'attack' | 'heal'
  G.spells[slot] = G.spells[slot] === id ? null : id;
  emit(EVENTS.SPELLS_PANEL);
  emit(EVENTS.RTC_PANEL);
  emit(EVENTS.NOTIFY, { msg: G.spells[slot] ? `RTC vai castar "${s.words}" automaticamente.` : `"${s.words}" removida do RTC.`, type: 'info' });
  saveGame();
}
