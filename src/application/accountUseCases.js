// Até 2 personagens por conta (slots 0 e 1) — ver .spec/17-contas-e-login.md,
// Regra 7. Trocar de slot (ou criar o 2º personagem, que é só trocar pro slot
// vazio) salva o personagem ativo e RECARREGA A PÁGINA: o boot normal do jogo
// (main.js: loadGame → applyOfflineProgress → bootGame) já sabe calcular
// progresso offline e religar tudo certinho pro personagem carregado — cada
// slot guarda seu próprio G.lastSave, então o offline gain fica correto pros
// dois independentemente de quando cada um foi jogado por último. Evita
// duplicar toda a lógica de start/stop de intervalos (caçada/treino/regen)
// que só faz sentido rodar uma vez, no boot.
import { G, ACCOUNT } from './gameStore.js?v=169';
import { saveGame, flushCloudSave } from './saveGameUseCase.js?v=169';
import { saveState } from '../infrastructure/storage.js?v=165';
import { saveCloudSave, isLoggedIn } from '../infrastructure/authClient.js?v=174';
import { emit, EVENTS } from '../shared/eventBus.js?v=167';
import { t } from '../i18n/i18n.js?v=183';

const MAX_CHARACTER_SLOTS = 2;

// Resumo de cada slot pra UI (Configurações) — nunca o blob inteiro do
// personagem, só o suficiente pra identificar/escolher.
export function getCharacterSlots() {
  return ACCOUNT.slots.map((s, i) => (s && s.vocation)
    ? { slot: i, empty: false, active: i === ACCOUNT.activeSlot, vocation: s.vocation, level: s.level, name: s.playerName || null }
    : { slot: i, empty: true, active: i === ACCOUNT.activeSlot });
}

// Troca o personagem ativo: salva o atual (local + nuvem, sem esperar o
// debounce de 8s) no próprio slot, marca o novo slot como ativo e recarrega —
// o slot novo pode estar vazio (2º personagem ainda não criado), nesse caso o
// boot cai direto na tela de escolha de vocação, igual ao 1º personagem.
async function switchCharacterSlot(slot) {
  if (slot < 0 || slot >= MAX_CHARACTER_SLOTS || slot === ACCOUNT.activeSlot) return;
  if (G.vocation) saveGame(); // nada a salvar se o slot atual nunca virou personagem
  await flushCloudSave();
  ACCOUNT.activeSlot = slot;
  saveState(ACCOUNT);
  if (isLoggedIn()) await saveCloudSave(ACCOUNT);
  location.reload();
}

export function confirmSwitchCharacterSlot(slot) {
  const target = getCharacterSlots()[slot];
  if (!target) return;
  const msg = target.empty ? t('account.confirmCreateSlot') : t('account.confirmSwitchSlot', { name: target.name || target.vocation });
  if (confirm(msg)) {
    emit(EVENTS.NOTIFY, { msg: t('account.switching'), type: 'success' });
    switchCharacterSlot(slot);
  }
}
