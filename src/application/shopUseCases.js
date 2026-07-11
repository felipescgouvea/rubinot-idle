import { G } from './gameStore.js?v=39';
import { SHOP_ITEMS, isBoostActive } from '../domain/shopCatalog.js?v=39';
import { ITEMS } from '../domain/items.js?v=39';
import { emit, EVENTS } from '../shared/eventBus.js?v=39';
import { getMaxHp, getMaxMana } from './stats.js?v=39';
import { addItemToInventory } from './inventoryCore.js?v=39';
import { saveGame } from './saveGameUseCase.js?v=39';

export function buyShopItem(id) {
  const s = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;

  // Loja Premium (dinheiro real) ainda não está ligada a um gateway de
  // pagamento — não creditamos Rubini Coins de graça só porque o botão foi
  // clicado; isso deixaria a loja mentindo sobre uma compra que não aconteceu.
  if (s.currency === 'real') {
    emit(EVENTS.NOTIFY, { msg: '💳 Pagamento com dinheiro real ainda não conectado a um gateway (Stripe/Mercado Pago/PIX). Fale com o suporte por enquanto.', type: 'error' });
    return;
  }

  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  if (balance < s.price) { emit(EVENTS.NOTIFY, { msg: 'Saldo insuficiente.', type: 'error' }); return; }
  if (s.currency === 'rubini') G.rubini -= s.price; else G.gold -= s.price;

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
    addItemToInventory(s.itemId);
    emit(EVENTS.NOTIFY, { msg: `${s.icon} ${ITEMS[s.itemId].name} comprado! Veja no inventário.`, type: 'success' });
  }

  emit(EVENTS.SHOP_PANEL);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}
