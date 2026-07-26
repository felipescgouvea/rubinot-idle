import { G, ACCOUNT } from './gameStore.js?v=327';
import { SHOP_ITEMS } from '../domain/shopCatalog.js?v=326';
import { ITEMS } from '../domain/items.js?v=338';
import { emit, EVENTS } from '../shared/eventBus.js?v=325';
import { buyShopItemOnServer, buyBoostOnServer } from '../infrastructure/authClient.js?v=335';
import { saveGame } from './saveGameUseCase.js?v=327';
import { t } from '../i18n/i18n.js?v=343';

export async function buyShopItem(id, qty = 1) {
  const s = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;

  // Loja Premium (dinheiro real) ainda não está ligada a um gateway de
  // pagamento — não creditamos Rubini Coins de graça só porque o botão foi
  // clicado; isso deixaria a loja mentindo sobre uma compra que não aconteceu.
  if (s.currency === 'real') {
    emit(EVENTS.NOTIFY, { msg: t('shop.realMoneyNotConnected'), type: 'error' });
    return;
  }

  // Só consumíveis empilháveis (poções/runas) podem ser comprados em quantidade;
  // equipamento/boost/refill/outfit são sempre 1.
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const isBulk = s.type === 'item' && item && (item.type === 'potion' || item.type === 'rune');
  const count = isBulk ? Math.max(1, Math.min(9999, Math.floor(Number(qty) || 1))) : 1;
  const total = s.price * count;

  // Compra em GOLD de item/refill: AUTORITATIVA no servidor (ver
  // server/src/index.js: /shop/buy) — antes G.gold/G.inventory/G.hp/G.mana
  // só mutavam aqui e o próximo reconcileWithServer() revertia tudo em
  // silêncio (achado na varredura de QA: dinheiro sumia/reaparecia sozinho).
  // Rubini/boost continuam locais por ora (ver nota no servidor: rubini não
  // tem coluna própria hoje, e boost ainda não é aplicado no cálculo real do
  // servidor — cobrar por ele autoritativamente não teria efeito nenhum).
  if (s.currency === 'gold' && (s.type === 'item' || s.type === 'refill')) {
    if (G.gold < total) { emit(EVENTS.NOTIFY, { msg: t('shop.insufficientBalance'), type: 'error' }); return; }
    const res = await buyShopItemOnServer(ACCOUNT.activeSlot, s.id, count);
    if (!res.ok) { emit(EVENTS.NOTIFY, { msg: res.error || t('shop.insufficientBalance'), type: 'error' }); return; }
    G.gold = res.gold;
    if (res.hp != null) G.hp = res.hp;
    if (res.mana != null) G.mana = res.mana;
    // Aplica o item comprado no inventário local NA HORA — antes só emitíamos
    // EVENTS.INVENTORY sem tocar G.inventory, então painéis que leem direto
    // dali (ex.: ui/rtcPanel.js: openRtcPotionPicker) mostravam a quantia
    // ANTIGA até o próximo reconcileWithServer (que só roda caçando) corrigir
    // sozinho — bug reportado pelo Felipe: comprou poção na loja, foi
    // configurar no RTC e via "possui 0".
    if (res.itemId && res.qty != null) {
      G.inventory[res.itemId] = res.qty;
      if (!G.inventoryOrder.includes(res.itemId)) G.inventoryOrder.push(res.itemId);
    }
    emit(EVENTS.NOTIFY, {
      msg: s.type === 'refill' ? t('shop.refillSuccess') : t('shop.itemPurchased', { count, name: item.name }),
      type: 'success',
    });
    emit(EVENTS.SHOP_PANEL);
    emit(EVENTS.HEADER_STATS);
    emit(EVENTS.CHAR_INFO);
    emit(EVENTS.BARS);
    emit(EVENTS.INVENTORY);
    saveGame();
    return;
  }

  if ((G.rubini || 0) < total) { emit(EVENTS.NOTIFY, { msg: t('shop.insufficientBalance'), type: 'error' }); return; }
  // #3: boost é SERVER-AUTHORITATIVE. O servidor debita Rubini E concede o boost
  // (grava player_stats.boosts + aplica na sessão viva de caçada, então vale JÁ, sem
  // precisar rezonar). Antes G.boosts só mudava local e o /hunt/start confiava em
  // body.boosts — cliente forjava +50% permanente e o boost comprado no meio da caça
  // não valia até reiniciar. Aqui só espelhamos o que o servidor devolveu. (Só boost
  // de Rubini chega aqui — gold item/refill é tratado acima; currency 'real' sai no topo.)
  const res = await buyBoostOnServer(ACCOUNT.activeSlot, s.id);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: res.error || t('shop.insufficientBalance'), type: 'error' }); return; }
  if (res.rubini != null) G.rubini = res.rubini;
  if (res.boosts) G.boosts = res.boosts;
  emit(EVENTS.NOTIFY, { msg: t('shop.boostActivated', { icon: s.icon, name: s.name, minutes: s.minutes }), type: 'success' });

  emit(EVENTS.SHOP_PANEL);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}
