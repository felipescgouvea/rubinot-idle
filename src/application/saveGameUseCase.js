// saveGame isolado num módulo-folha (só depende do estado + storage) de
// propósito: praticamente todo caso de uso do jogo termina salvando, e um
// módulo "persistence" mais encorpado (load/offline/reset) precisa chamar
// gainXp/checkBpTier de outras camadas — se saveGame morasse junto, isso
// criaria import circular entre metade dos casos de uso do jogo.
import { G, ACCOUNT } from './gameStore.js?v=344';
import { saveState } from '../infrastructure/storage.js?v=340';
import { saveCloudSave, isLoggedIn } from '../infrastructure/authClient.js?v=352';

// saveGame roda muito (a cada morte/ação), então o local é imediato mas o push
// pra nuvem é "debounced": só sobe ~8s depois da última alteração, evitando uma
// enxurrada de requisições. flushCloudSave() força o envio imediato (logout/saída).
// Salva sempre a CONTA inteira (os até 2 slots), não só o personagem ativo —
// senão o outro personagem nunca seria persistido de novo depois de criado.
let cloudTimer = null;

// TRAVA CONTRA APAGAR SAVE NA NUVEM COM ESTADO VAZIO.
//
// Uma conta sem NENHUM personagem é indistinguível, no payload, de um estado
// que ainda não carregou. Subir isso por cima da nuvem apaga o progresso de
// quem já tinha personagem — e não é hipótese: o marco de reset descarta o
// save da nuvem na sessão, e o autosave em seguida gravava o vazio por cima.
// Foi assim que o personagem da conta de teste sumiu duas vezes.
//
// O jogador que REALMENTE quer zerar usa o reset explícito (confirmReset), que
// grava direto; este caminho é só o autosave, e autosave nunca deve destruir.
function contaTemPersonagem(acc) {
  return !!(acc && Array.isArray(acc.slots) && acc.slots.some(s => s && s.vocation));
}


// Campos de economia REAL (Marco 6b): desde que o servidor de caçada virou a
// única fonte de verdade pra eles (ver huntUseCases.js: reconcileWithServer),
// mantê-los no blob da nuvem só cria risco de um dispositivo puxar um valor
// velho/divergente antes do 1º reconcile. Ficam de fora só do payload que sobe
// pra public.saves — o localStorage deste dispositivo continua com eles (só
// como preview otimista até a próxima reconciliação; nunca é a fonte de verdade).
// `level` FICA DE FORA desta lista de propósito: é só o rótulo cosmético do
// seletor de personagem (ver ui/settingsPanel.js: getCharacterSlots) — sem
// nenhum peso econômico — e é o único jeito de mostrar o nível do slot
// INATIVO (nada reconcilia esse slot com o servidor fora dele estar caçando).
// Removê-lo daqui deixava "(level ,)" em branco pro personagem que não está
// sendo jogado no momento (bug reportado pelo Felipe).
// inventoryOrder NÃO entra aqui: é só a ordem de arraste da Mochila (preferência
// de UI), não tem escritor autoritativo no servidor. Deixá-lo na lista fazia a
// ordem escolhida sumir ao trocar de dispositivo (achado da auditoria). O
// inventário em si continua reconciliado do servidor; a ordem só complementa.
const ECONOMY_FIELDS = ['gold', 'xp', 'hp', 'mana', 'sk', 'inventory', 'relics', 'relicSeq', 'blessings', 'stamina', 'totalGoldEarned', 'totalKills'];

export function stripEconomyFieldsForCloud(account) {
  return {
    activeSlot: account.activeSlot,
    slots: account.slots.map(slot => {
      if (!slot) return slot;
      const clean = { ...slot };
      ECONOMY_FIELDS.forEach(f => delete clean[f]);
      return clean;
    }),
  };
}

export function saveGame() {
  G.lastSave = Date.now();
  G.wasHunting = G.hunting;
  ACCOUNT.slots[ACCOUNT.activeSlot] = G;
  saveState(ACCOUNT);
  if (isLoggedIn()) {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => {
      if (!contaTemPersonagem(ACCOUNT)) return;   // nunca sobe vazio por cima da nuvem
      saveCloudSave(stripEconomyFieldsForCloud(ACCOUNT));
    }, 8000);
  }
}

export function flushCloudSave() {
  clearTimeout(cloudTimer);
  if (isLoggedIn() && contaTemPersonagem(ACCOUNT)) return saveCloudSave(stripEconomyFieldsForCloud(ACCOUNT));
  return Promise.resolve();
}
