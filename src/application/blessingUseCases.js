// Compra de bênçãos (Blessings) — pagas em gold, reduzem a perda de XP na morte
// e melhoram o revive. Consumidas ao morrer (ver server/src/huntEngine.js —
// desde o Marco 6, a contagem de bênçãos e o gasto de gold são validados no
// servidor, não só declarados pelo cliente).
import { G, ACCOUNT } from './gameStore.js?v=213';
import { MAX_BLESSINGS, blessingCost } from '../domain/blessings.js?v=209';
import { emit, EVENTS } from '../shared/eventBus.js?v=211';
import { saveGame } from './saveGameUseCase.js?v=213';
import { buyBlessingOnServer } from '../infrastructure/authClient.js?v=218';
import { t } from '../i18n/i18n.js?v=227';

export async function buyBlessing() {
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
  const res = await buyBlessingOnServer(ACCOUNT.activeSlot);
  if (!res.ok) {
    emit(EVENTS.NOTIFY, { msg: `⚠️ Não confirmado pelo servidor: ${res.error}`, type: 'error' });
    return;
  }
  G.gold = res.gold;
  G.blessings = res.blessings;
  emit(EVENTS.NOTIFY, { msg: t('hunt.blessingBought', { count: G.blessings, max: MAX_BLESSINGS }), type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.BLESSINGS);
  saveGame();
}
