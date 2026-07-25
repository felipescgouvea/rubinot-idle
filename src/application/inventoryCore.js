// addItemToInventory isolado num módulo-folha: é usado por caçada, loja,
// battle pass e market — deixá-lo dentro de inventoryUseCases.js (que por
// sua vez precisa chamar de volta a resolução de combate ao usar uma runa)
// criaria import circular com metade do jogo.
import { G } from './gameStore.js?v=308';

// A bag NÃO tem limite de tipos distintos: antes um teto de 20 fazia o loot
// novo ser silenciosamente recusado com a bag cheia, o que num jogo idle
// (onde o jogador não está olhando) só gerava perda invisível de item.
// Quantidade por item também nunca teve limite. Retorna true sempre — a
// assinatura fica como estava porque quem chama testa o retorno.
export function addItemToInventory(itemId) {
  const isNew = !G.inventory[itemId];
  if (isNew && !Array.isArray(G.inventoryOrder)) G.inventoryOrder = [];
  G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
  // mantém a ordem de exibição do inventário (drag-and-drop): item inédito
  // entra no fim da lista; ver ui/inventoryAndEquipmentPanel.js.
  if (isNew && !G.inventoryOrder.includes(itemId)) G.inventoryOrder.push(itemId);
  return true;
}
