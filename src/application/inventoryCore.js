// addItemToInventory isolado num módulo-folha: é usado por caçada, loja,
// battle pass e market — deixá-lo dentro de inventoryUseCases.js (que por
// sua vez precisa chamar de volta a resolução de combate ao usar uma runa)
// criaria import circular com metade do jogo.
import { G } from './gameStore.js?v=164';
import { BAG_MAX_SLOTS } from '../domain/items.js?v=175';

// Um item já possuído sempre empilha (sem limite de quantidade). Um item
// NOVO só entra se ainda houver slot livre (máx. BAG_MAX_SLOTS tipos
// distintos — ver domain/items.js) — bag cheia recusa o item novo. Retorna
// true se o item entrou, false se foi recusado (quem chama decide o que
// fazer: ex. o log de loot pula a linha desse item — ver huntUseCases.js).
export function addItemToInventory(itemId) {
  const isNew = !G.inventory[itemId];
  if (isNew) {
    if (!Array.isArray(G.inventoryOrder)) G.inventoryOrder = [];
    if (G.inventoryOrder.length >= BAG_MAX_SLOTS) return false;
  }
  G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
  // mantém a ordem de exibição do inventário (drag-and-drop): item inédito
  // entra no fim da lista; ver ui/inventoryAndEquipmentPanel.js.
  if (isNew && !G.inventoryOrder.includes(itemId)) G.inventoryOrder.push(itemId);
  return true;
}
