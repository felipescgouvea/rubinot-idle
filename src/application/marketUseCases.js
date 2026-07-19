// Market entre jogadores: depositar/sacar da carteira, anunciar, cancelar e
// comprar itens. Servidor (Railway) é a única fonte de verdade — este
// arquivo só chama as rotas novas em infrastructure/authClient.js e, DEPOIS
// da confirmação `ok` do servidor, muta G localmente pra cache/feedback
// visual (nunca antes — evita ter que reverter uma mutação otimista).
import { G, ACCOUNT } from './gameStore.js?v=129';
import { ITEMS } from '../domain/items.js?v=140';
import { emit, EVENTS } from '../shared/eventBus.js?v=127';
import { t } from '../i18n/i18n.js?v=143';
import {
  fetchMarketWallet, depositToMarketOnServer, withdrawFromMarketOnServer,
  fetchMarketListingsOnServer, listItemOnServerMarket, cancelListingOnServerMarket,
  buyListingOnServerMarket, fetchMarketStatsOnServer,
} from '../infrastructure/authClient.js';
import { saveGame } from './saveGameUseCase.js?v=129';

export async function fetchMyMarketWallet() {
  const result = await fetchMarketWallet(ACCOUNT.activeSlot);
  return result.ok ? result.balance : null;
}

// Retorna { listings: [...], feePct } — cada listing tem id, sellerName,
// itemId, qty, pricePerUnit, expiresAt, mine.
export async function fetchMarketListings() {
  const result = await fetchMarketListingsOnServer(ACCOUNT.activeSlot);
  return result.ok ? { listings: result.listings, feePct: result.feePct } : null;
}

// Estatística de preço de um item (últimas vendas): { count, last, avg, min, max }.
export async function fetchMarketStats(itemId) {
  const result = await fetchMarketStatsOnServer(ACCOUNT.activeSlot, itemId);
  return result.ok ? result : null;
}

export async function depositToMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidAmount'), type: 'error' }); return; }
  if (amount > G.gold) { emit(EVENTS.NOTIFY, { msg: t('market.notEnoughGold'), type: 'error' }); return; }
  const result = await depositToMarketOnServer(ACCOUNT.activeSlot, amount);
  if (!result.ok) { emit(EVENTS.NOTIFY, { msg: result.error || t('market.invalidAmount'), type: 'error' }); return; }
  G.gold = result.gold;
  emit(EVENTS.NOTIFY, { msg: t('market.depositSuccess', { amount }), type: 'success' });
  emit(EVENTS.HEADER_STATS);
  saveGame();
  emit(EVENTS.MARKET_PANEL);
}

export async function withdrawFromMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidAmount'), type: 'error' }); return; }
  const result = await withdrawFromMarketOnServer(ACCOUNT.activeSlot, amount);
  if (!result.ok) { emit(EVENTS.NOTIFY, { msg: result.error || t('market.invalidAmount'), type: 'error' }); return; }
  G.gold = result.gold;
  emit(EVENTS.NOTIFY, { msg: t('market.withdrawSuccess', { amount }), type: 'success' });
  emit(EVENTS.HEADER_STATS);
  saveGame();
  emit(EVENTS.MARKET_PANEL);
}

export async function listItemOnMarket(itemId, qty, price) {
  qty = Math.floor(Number(qty));
  price = Math.floor(Number(price));
  const owned = G.inventory[itemId] || 0;
  if (!itemId || !ITEMS[itemId]) { emit(EVENTS.NOTIFY, { msg: t('market.selectItem'), type: 'error' }); return; }
  if (!qty || qty <= 0 || qty > owned) { emit(EVENTS.NOTIFY, { msg: t('market.invalidQuantity'), type: 'error' }); return; }
  if (!price || price <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidPrice'), type: 'error' }); return; }
  const result = await listItemOnServerMarket(ACCOUNT.activeSlot, itemId, qty, price, G.playerName);
  if (!result.ok) { emit(EVENTS.NOTIFY, { msg: result.error || t('market.invalidQuantity'), type: 'error' }); return; }
  G.inventory[itemId] -= qty;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  emit(EVENTS.NOTIFY, { msg: t('market.listingCreated', { qty, name: ITEMS[itemId].name }), type: 'success' });
  emit(EVENTS.INVENTORY);
  saveGame();
  emit(EVENTS.MARKET_PANEL);
}

export async function cancelMyListing(listingId, itemId, qty) {
  const result = await cancelListingOnServerMarket(ACCOUNT.activeSlot, listingId);
  if (!result.ok) { emit(EVENTS.NOTIFY, { msg: result.error || t('market.loadError'), type: 'error' }); return; }
  G.inventory[itemId] = (G.inventory[itemId] || 0) + qty;
  emit(EVENTS.NOTIFY, { msg: t('market.listingCancelled'), type: 'info' });
  emit(EVENTS.INVENTORY);
  saveGame();
  emit(EVENTS.MARKET_PANEL);
}

export async function buyMarketListing(listingId, qtyToBuy) {
  qtyToBuy = Math.floor(Number(qtyToBuy));
  if (!qtyToBuy || qtyToBuy <= 0) { emit(EVENTS.NOTIFY, { msg: t('market.invalidQuantity'), type: 'error' }); return; }
  const result = await buyListingOnServerMarket(ACCOUNT.activeSlot, listingId, qtyToBuy);
  if (!result.ok) { emit(EVENTS.NOTIFY, { msg: result.error || t('market.invalidQuantity'), type: 'error' }); return; }
  G.inventory[result.itemId] = (G.inventory[result.itemId] || 0) + result.qty;
  emit(EVENTS.NOTIFY, { msg: t('market.purchaseSuccess', { qty: result.qty, name: ITEMS[result.itemId]?.name || result.itemId }), type: 'success' });
  emit(EVENTS.INVENTORY);
  saveGame();
  emit(EVENTS.MARKET_PANEL);
}
