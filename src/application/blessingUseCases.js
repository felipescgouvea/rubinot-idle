// Compra de bênçãos (Blessings) — pagas em gold, reduzem a perda de XP na morte
// e melhoram o revive. Consumidas ao morrer (ver application/huntUseCases.js).
import { G } from './gameStore.js?v=126';
import { MAX_BLESSINGS, blessingCost } from '../domain/blessings.js?v=125';
import { emit, EVENTS } from '../shared/eventBus.js?v=125';
import { saveGame } from './saveGameUseCase.js?v=126';
import { t } from '../i18n/i18n.js?v=134';

export function buyBlessing() {
  G.blessings = G.blessings || 0;
  if (G.blessings >= MAX_BLESSINGS) {
    emit(EVENTS.NOTIFY, { msg: t('hunt.blessingsMaxed'), type: 'info' });
    return;
  }
  const cost = blessingCost(G.level);
  if (G.gold < cost) {
    emit(EVENTS.NOTIFY, { msg: t('hunt.blessingGoldInsufficient', { cost }), type: 'error' });
    return;
  }
  G.gold -= cost;
  G.blessings += 1;
  emit(EVENTS.NOTIFY, { msg: t('hunt.blessingBought', { count: G.blessings, max: MAX_BLESSINGS }), type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BLESSINGS);
  saveGame();
}
