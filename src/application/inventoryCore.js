// addItemToInventory isolado num módulo-folha: é usado por caçada, loja,
// battle pass e market — deixá-lo dentro de inventoryUseCases.js (que por
// sua vez precisa chamar de volta a resolução de combate ao usar uma runa)
// criaria import circular com metade do jogo.
import { G } from './gameStore.js?v=13';

export function addItemToInventory(itemId) {
  G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
}
