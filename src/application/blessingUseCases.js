// Compra de bênçãos (Blessings) — pagas em gold, reduzem a perda de XP na morte
// e melhoram o revive. Consumidas ao morrer (ver application/huntUseCases.js).
import { G } from './gameStore.js?v=95';
import { MAX_BLESSINGS, blessingCost } from '../domain/blessings.js?v=95';
import { emit, EVENTS } from '../shared/eventBus.js?v=95';
import { saveGame } from './saveGameUseCase.js?v=95';

export function buyBlessing() {
  G.blessings = G.blessings || 0;
  if (G.blessings >= MAX_BLESSINGS) {
    emit(EVENTS.NOTIFY, { msg: 'Você já tem todas as bênçãos.', type: 'info' });
    return;
  }
  const cost = blessingCost(G.level);
  if (G.gold < cost) {
    emit(EVENTS.NOTIFY, { msg: `Gold insuficiente (precisa ${cost}).`, type: 'error' });
    return;
  }
  G.gold -= cost;
  G.blessings += 1;
  emit(EVENTS.NOTIFY, { msg: `🛡️ Bênção comprada! (${G.blessings}/${MAX_BLESSINGS})`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BLESSINGS);
  saveGame();
}
