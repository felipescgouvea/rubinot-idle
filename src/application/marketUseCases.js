// Market entre jogadores: depositar/sacar da carteira, anunciar, cancelar e
// comprar itens. Mesmo modelo de confiança do ranking global (secret gerado
// no navegador + funções SECURITY DEFINER no banco como fronteira real).
import { G } from './gameStore.js?v=129';
import { ITEMS } from '../domain/items.js?v=138';
import { emit, EVENTS } from '../shared/eventBus.js?v=126';
import { t } from '../i18n/i18n.js?v=139';
import {
  fetchMyWalletRequest, fetchListingsRequest, depositRequest, withdrawRequest,
  listItemRequest, cancelListingRequest, buyListingRequest,
} from '../infrastructure/marketApi.js?v=125';
import { addItemToInventory } from './inventoryCore.js?v=127';
import { ensurePlayerSecret } from './highscoresUseCases.js?v=129';
import { saveGame } from './saveGameUseCase.js?v=128';

export async function fetchMyMarketWallet() {
  if (!G.playerSecret) return 0;
  try {
    return await fetchMyWalletRequest(G.playerSecret);
  } catch (e) {
    return null;
  }
}

export function fetchMarketListings() {
  return fetchListingsRequest();
}

export async function depositToMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidAmount'), type: 'error' }); return; }
  if (amount > G.gold) { emit(EVENTS.NOTIFY, { msg: t('market.notEnoughGold'), type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    await depositRequest(G.playerSecret, G.playerName, amount);
    G.gold -= amount;
    emit(EVENTS.NOTIFY, { msg: t('market.depositSuccess', { amount }), type: 'success' });
    emit(EVENTS.HEADER_STATS);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function withdrawFromMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidAmount'), type: 'error' }); return; }
  try {
    await withdrawRequest(G.playerSecret, amount);
    G.gold += amount;
    emit(EVENTS.NOTIFY, { msg: t('market.withdrawSuccess', { amount }), type: 'success' });
    emit(EVENTS.HEADER_STATS);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function listItemOnMarket(itemId, qty, price) {
  qty = Math.floor(Number(qty));
  price = Math.floor(Number(price));
  const owned = G.inventory[itemId] || 0;
  if (!itemId || !ITEMS[itemId]) { emit(EVENTS.NOTIFY, { msg: t('market.selectItem'), type: 'error' }); return; }
  if (!qty || qty <= 0 || qty > owned) { emit(EVENTS.NOTIFY, { msg: t('market.invalidQuantity'), type: 'error' }); return; }
  if (!price || price <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidPrice'), type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    await listItemRequest(G.playerSecret, G.playerName, itemId, qty, price);
    G.inventory[itemId] -= qty;
    if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
    emit(EVENTS.NOTIFY, { msg: t('market.listingCreated', { qty, name: ITEMS[itemId].name }), type: 'success' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function cancelMyListing(listingId, itemId, qty) {
  try {
    await cancelListingRequest(G.playerSecret, listingId);
    G.inventory[itemId] = (G.inventory[itemId] || 0) + qty;
    emit(EVENTS.NOTIFY, { msg: t('market.listingCancelled'), type: 'info' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function buyMarketListing(listingId, qtyToBuy) {
  qtyToBuy = Math.floor(Number(qtyToBuy));
  if (!qtyToBuy || qtyToBuy <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidQuantity'), type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    const result = await buyListingRequest(G.playerSecret, G.playerName, listingId, qtyToBuy);
    G.inventory[result.item_id] = (G.inventory[result.item_id] || 0) + result.qty;
    emit(EVENTS.NOTIFY, { msg: t('market.purchaseSuccess', { qty: result.qty, name: ITEMS[result.item_id]?.name || result.item_id }), type: 'success' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}
