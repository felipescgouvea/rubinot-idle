// saveGame isolado num módulo-folha (só depende do estado + storage) de
// propósito: praticamente todo caso de uso do jogo termina salvando, e um
// módulo "persistence" mais encorpado (load/offline/reset) precisa chamar
// gainXp/checkBpTier de outras camadas — se saveGame morasse junto, isso
// criaria import circular entre metade dos casos de uso do jogo.
import { G, ACCOUNT } from './gameStore.js?v=127';
import { saveState } from '../infrastructure/storage.js?v=125';
import { saveCloudSave, isLoggedIn } from '../infrastructure/authClient.js?v=125';

// saveGame roda muito (a cada morte/ação), então o local é imediato mas o push
// pra nuvem é "debounced": só sobe ~8s depois da última alteração, evitando uma
// enxurrada de requisições. flushCloudSave() força o envio imediato (logout/saída).
// Salva sempre a CONTA inteira (os até 2 slots), não só o personagem ativo —
// senão o outro personagem nunca seria persistido de novo depois de criado.
let cloudTimer = null;

export function saveGame() {
  G.lastSave = Date.now();
  G.wasHunting = G.hunting;
  ACCOUNT.slots[ACCOUNT.activeSlot] = G;
  saveState(ACCOUNT);
  if (isLoggedIn()) {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => { saveCloudSave(ACCOUNT); }, 8000);
  }
}

export function flushCloudSave() {
  clearTimeout(cloudTimer);
  if (isLoggedIn()) return saveCloudSave(ACCOUNT);
  return Promise.resolve();
}
