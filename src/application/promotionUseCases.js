// Promoção de vocação (Elite Knight / Royal Paladin / Master Sorcerer / Elder
// Druid). Paga em gold, permanente, dobra a regeneração ociosa de HP/mana.
// Validada no servidor (nível e gold conferidos lá — nunca o cliente declara
// "promovi"; mesmo modelo de blessingUseCases/shopUseCases).
import { G, ACCOUNT } from './gameStore.js?v=263';
import { PROMOTION } from '../domain/character.js?v=291';
import { emit, EVENTS } from '../shared/eventBus.js?v=261';
import { saveGame } from './saveGameUseCase.js?v=263';
import { promoteOnServer } from '../infrastructure/authClient.js?v=271';

export async function promoteVocation() {
  if (!G.vocation) return;
  if (G.promoted) { emit(EVENTS.NOTIFY, { msg: '✨ Você já está promovido.', type: 'info' }); return; }
  if (G.level < PROMOTION.level) {
    emit(EVENTS.NOTIFY, { msg: `Promoção exige nível ${PROMOTION.level} (você está no ${G.level}).`, type: 'error' });
    return;
  }
  if (G.gold < PROMOTION.cost) {
    emit(EVENTS.NOTIFY, { msg: `Promoção custa ${PROMOTION.cost.toLocaleString()} de ouro.`, type: 'error' });
    return;
  }
  const res = await promoteOnServer(ACCOUNT.activeSlot);
  if (!res.ok) {
    emit(EVENTS.NOTIFY, { msg: `⚠️ Não confirmado pelo servidor: ${res.error}`, type: 'error' });
    return;
  }
  G.gold = res.gold;
  G.promoted = true;
  emit(EVENTS.NOTIFY, { msg: `⭐ Promovido para ${PROMOTION.names[G.vocation]}! Regeneração dobrada.`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}
