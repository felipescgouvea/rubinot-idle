// Chamadas de rede do Market (mercado entre jogadores). Espelha 1:1 as
// funções SECURITY DEFINER criadas no Supabase (rubinot_market_*) — ver
// as migrações do projeto para o schema completo (listings + wallets).

import { rpcRequest, selectRequest } from './supabaseClient.js?v=82';

export async function fetchMyWalletRequest(secret) {
  const gold = await rpcRequest('rubinot_market_my_wallet', { p_secret: secret });
  return gold || 0;
}

export function fetchListingsRequest() {
  return selectRequest(
    'rubinot_market_listings?select=id,seller_name,seller_secret,item_id,qty,price_per_unit,created_at&status=eq.active&order=created_at.desc&limit=100'
  );
}

export function depositRequest(secret, name, amount) {
  return rpcRequest('rubinot_market_deposit', { p_secret: secret, p_name: name, p_amount: amount });
}

export function withdrawRequest(secret, amount) {
  return rpcRequest('rubinot_market_withdraw', { p_secret: secret, p_amount: amount });
}

export function listItemRequest(secret, name, itemId, qty, price) {
  return rpcRequest('rubinot_market_list_item', { p_secret: secret, p_name: name, p_item_id: itemId, p_qty: qty, p_price: price });
}

export function cancelListingRequest(secret, listingId) {
  return rpcRequest('rubinot_market_cancel_listing', { p_secret: secret, p_listing_id: listingId });
}

export function buyListingRequest(secret, name, listingId, qty) {
  return rpcRequest('rubinot_market_buy', { p_secret: secret, p_name: name, p_listing_id: listingId, p_qty: qty });
}
