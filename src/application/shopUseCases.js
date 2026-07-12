import { G } from './gameStore.js?v=77';
import { SHOP_ITEMS, isBoostActive } from '../domain/shopCatalog.js?v=77';
import { ITEMS } from '../domain/items.js?v=77';
import { emit, EVENTS } from '../shared/eventBus.js?v=77';
import { getMaxHp, getMaxMana } from './stats.js?v=77';
import { addItemToInventory } from './inventoryCore.js?v=77';
import { saveGame } from './saveGameUseCase.js?v=77';

export function buyShopItem(id, qty = 1) {
  const s = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;

  // Loja Premium (dinheiro real) ainda não está ligada a um gateway de
  // pagamento — não creditamos Rubini Coins de graça só porque o botão foi
  // clicado; isso deixaria a loja mentindo sobre uma compra que não aconteceu.
  if (s.currency === 'real') {
    emit(EVENTS.NOTIFY, { msg: '💳 Pagamento com dinheiro real ainda não conectado a um gateway (Stripe/Mercado Pago/PIX). Fale com o suporte por enquanto.', type: 'error' });
    return;
  }

  // Só consumíveis empilháveis (poções/runas) podem ser comprados em quantidade;
  // equipamento/boost/refill/outfit são sempre 1.
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const isBulk = s.type === 'item' && item && (item.type === 'potion' || item.type === 'rune');
  const count = isBulk ? Math.max(1, Math.min(9999, Math.floor(Number(qty) || 1))) : 1;
  const total = s.price * count;

  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  if (balance < total) { emit(EVENTS.NOTIFY, { msg: 'Saldo insuficiente.', type: 'error' }); return; }
  if (s.currency === 'rubini') G.rubini -= total; else G.gold -= total;

  if (s.type === 'boost') {
    const now = Date.now();
    const base = isBoostActive(G.boosts, s.boost, now) ? G.boosts[s.boost] : now;
    G.boosts[s.boost] = base + s.minutes * 60000; // acumula tempo
    emit(EVENTS.NOTIFY, { msg: `${s.icon} ${s.name} ativado por ${s.minutes} min!`, type: 'success' });
  } else if (s.type === 'refill') {
    G.hp = getMaxHp();
    G.mana = getMaxMana();
    emit(EVENTS.NOTIFY, { msg: '🧪 HP e mana restaurados!', type: 'success' });
  } else if (s.type === 'item') {
    for (let i = 0; i < count; i++) addItemToInventory(s.itemId);
    emit(EVENTS.NOTIFY, { msg: `${count}× ${ITEMS[s.itemId].name} comprado(s)! Veja no inventário.`, type: 'success' });
  }

  emit(EVENTS.SHOP_PANEL);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}
