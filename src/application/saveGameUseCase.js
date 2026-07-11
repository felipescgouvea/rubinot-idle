// saveGame isolado num módulo-folha (só depende do estado + storage) de
// propósito: praticamente todo caso de uso do jogo termina salvando, e um
// módulo "persistence" mais encorpado (load/offline/reset) precisa chamar
// gainXp/checkBpTier de outras camadas — se saveGame morasse junto, isso
// criaria import circular entre metade dos casos de uso do jogo.
import { G } from './gameStore.js?v=20';
import { saveState } from '../infrastructure/storage.js?v=20';

export function saveGame() {
  G.lastSave = Date.now();
  G.wasHunting = G.hunting;
  saveState(G);
}
