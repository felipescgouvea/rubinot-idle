// Regras econômicas do Mercado entre jogadores (fiel ao Tibia: há taxa da casa
// e as ofertas expiram). Puro — usado no servidor (validação) e no cliente
// (exibição). A taxa é um SINK de gold (sai da economia), o que segura a
// inflação típica de idle game.
export const MARKET_FEE_PCT = 5;       // % da venda que a casa retém
export const MARKET_LISTING_DAYS = 7;  // dias até a oferta expirar e devolver o item

export function marketFee(total) {
  return Math.floor((total * MARKET_FEE_PCT) / 100);
}
// Quanto o vendedor recebe de fato (total menos a taxa).
export function sellerProceeds(total) {
  return total - marketFee(total);
}
