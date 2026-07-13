// addItemToInventory isolado num módulo-folha: é usado por caçada, loja,
// battle pass e market — deixá-lo dentro de inventoryUseCases.js (que por
// sua vez precisa chamar de volta a resolução de combate ao usar uma runa)
// criaria import circular com metade do jogo.
import { G } from './gameStore.js?v=115';

export function addItemToInventory(itemId) {
  const isNew = !G.inventory[itemId];
  G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
  // mantém a ordem de exibição do inventário (drag-and-drop): item inédito
  // entra no fim da lista; ver ui/inventoryAndEquipmentPanel.js.
  if (isNew) {
    if (!Array.isArray(G.inventoryOrder)) G.inventoryOrder = [];
    if (!G.inventoryOrder.includes(itemId)) G.inventoryOrder.push(itemId);
  }
}
