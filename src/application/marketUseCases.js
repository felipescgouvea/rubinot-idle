// Market entre jogadores: depositar/sacar da carteira, anunciar, cancelar e
// comprar itens. Mesmo modelo de confiança do ranking global (secret gerado
// no navegador + funções SECURITY DEFINER no banco como fronteira real).
import { G } from './gameStore.js?v=79';
import { ITEMS } from '../domain/items.js?v=79';
import { emit, EVENTS } from '../shared/eventBus.js?v=79';
import {
  fetchMyWalletRequest, fetchListingsRequest, depositRequest, withdrawRequest,
  listItemRequest, cancelListingRequest, buyListingRequest,
} from '../infrastructure/marketApi.js?v=79';
import { addItemToInventory } from './inventoryCore.js?v=79';
import { ensurePlayerSecret } from './highscoresUseCases.js?v=79';
import { saveGame } from './saveGameUseCase.js?v=79';

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
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: 'Valor inválido.', type: 'error' }); return; }
  if (amount > G.gold) { emit(EVENTS.NOTIFY, { msg: 'Você não tem esse tanto de gold no personagem.', type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    await depositRequest(G.playerSecret, G.playerName, amount);
    G.gold -= amount;
    emit(EVENTS.NOTIFY, { msg: `+${amount} 💰 depositado na carteira do Market.`, type: 'success' });
    emit(EVENTS.HEADER_STATS);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function withdrawFromMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { emit(EVENTS.NOTIFY, { msg: 'Valor inválido.', type: 'error' }); return; }
  try {
    await withdrawRequest(G.playerSecret, amount);
    G.gold += amount;
    emit(EVENTS.NOTIFY, { msg: `+${amount} 💰 sacado para o personagem.`, type: 'success' });
    emit(EVENTS.HEADER_STATS);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function listItemOnMarket(itemId, qty, price) {
  qty = Math.floor(Number(qty));
  price = Math.floor(Number(price));
  const owned = G.inventory[itemId] || 0;
  if (!itemId || !ITEMS[itemId]) { emit(EVENTS.NOTIFY, { msg: 'Selecione um item.', type: 'error' }); return; }
  if (!qty || qty <= 0 || qty > owned) { emit(EVENTS.NOTIFY, { msg: 'Quantidade inválida.', type: 'error' }); return; }
  if (!price || price <= 0) { emit(EVENTS.NOTIFY, { msg: 'Preço inválido.', type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    await listItemRequest(G.playerSecret, G.playerName, itemId, qty, price);
    G.inventory[itemId] -= qty;
    if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
    emit(EVENTS.NOTIFY, { msg: `Anúncio criado: ${qty}x ${ITEMS[itemId].name}.`, type: 'success' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function cancelMyListing(listingId, itemId, qty) {
  try {
    await cancelListingRequest(G.playerSecret, listingId);
    G.inventory[itemId] = (G.inventory[itemId] || 0) + qty;
    emit(EVENTS.NOTIFY, { msg: 'Anúncio cancelado — item devolvido ao inventário.', type: 'info' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}

export async function buyMarketListing(listingId, qtyToBuy) {
  qtyToBuy = Math.floor(Number(qtyToBuy));
  if (!qtyToBuy || qtyToBuy <= 0) { emit(EVENTS.NOTIFY, { msg: 'Quantidade inválida.', type: 'error' }); return; }
  ensurePlayerSecret();
  try {
    const result = await buyListingRequest(G.playerSecret, G.playerName, listingId, qtyToBuy);
    G.inventory[result.item_id] = (G.inventory[result.item_id] || 0) + result.qty;
    emit(EVENTS.NOTIFY, { msg: `Comprado: ${result.qty}x ${ITEMS[result.item_id]?.name || result.item_id}.`, type: 'success' });
    emit(EVENTS.INVENTORY);
    saveGame();
    emit(EVENTS.MARKET_PANEL);
  } catch (e) { emit(EVENTS.NOTIFY, { msg: e.message, type: 'error' }); }
}
