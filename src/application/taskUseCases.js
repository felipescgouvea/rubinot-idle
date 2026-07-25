// Linked Tasks: iniciar, progredir e cancelar. Escuta MONSTER_KILLED (emitido
// pela caçada) em vez de a caçada chamar isto diretamente — a caçada não
// precisa saber que tasks existem, só anuncia mortes.
//
// O AVANÇO (taskCompletion, o que desbloqueia salas/tasks) é AUTORITATIVO NO
// SERVIDOR (ver server/src/index.js: /task/state, /task/complete) — achado de
// auditoria: G.taskCompletion nunca era reconciliado (não está em
// ECONOMY_FIELDS de saveGameUseCase.js), então sobrevivia intacto num save
// forjado e um cliente adulterado desbloqueava as 5 salas pra sempre sem
// matar nada.
//
// A RECOMPENSA também é server-authoritative e COLETADA pelo jogador (#1/#6):
// ao bater o alvo a task fica "pronta" (não credita nada); o jogador clica
// pra coletar (claimTaskReward), e é o /task/complete que concede xp/gold/item
// de fato. Antes o cliente creditava local e o reconcile de gold/xp/inventário
// revertia tudo — a recompensa (xp de task chega a dezenas de milhões)
// evaporava. taskCoin fica local (não está em ECONOMY_FIELDS, não é revertido).
import { G, ACCOUNT } from './gameStore.js?v=301';
import { MONSTERS } from '../domain/bestiary.js?v=320';
import { ITEMS } from '../domain/items.js?v=312';
import { TASK_ROOMS, taskKey, isTaskUnlocked, isRoomUnlocked } from '../domain/progression.js?v=300';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=299';
import { getMaxHp, getMaxMana } from './stats.js?v=298';
import { bumpMissionProgress } from './battlePassUseCases.js?v=298';
import { saveGame } from './saveGameUseCase.js?v=301';
import { fetchTaskState, completeTaskOnServer } from '../infrastructure/authClient.js?v=309';
import { t } from '../i18n/i18n.js?v=317';

// Busca o mapa real de conclusões do servidor e espelha em G — chamado no
// boot, pra nunca depender de um valor que só existia no save local/na nuvem
// sem checagem nenhuma.
export async function syncTaskState() {
  const res = await fetchTaskState(ACCOUNT.activeSlot);
  if (!res.ok) return;
  G.taskCompletion = res.completion || {};
  emit(EVENTS.TASKS_PANEL);
}

function findTask(roomId, taskIndex) {
  const room = TASK_ROOMS.find(r => r.id === roomId);
  if (!room) return null;
  const task = room.tasks[taskIndex];
  if (!task) return null;
  return { room, task };
}

export function startTask(roomId, taskIndex) {
  if (G.activeTask) {
    emit(EVENTS.NOTIFY, { msg: t('tasks.onlyOneActive'), type: 'error' });
    return;
  }
  const found = findTask(roomId, taskIndex);
  if (!found) return;
  const roomIndex = TASK_ROOMS.findIndex(r => r.id === roomId);
  if (!isRoomUnlocked(roomIndex, G.taskCompletion) || !isTaskUnlocked(found.room, taskIndex, G.taskCompletion)) return;
  const { task } = found;
  const key = taskKey(task);
  G.activeTask = { roomId, taskIndex, key, monsters: task.m, required: task.n, started: Date.now() };
  G.taskKills[key] = G.taskKills[key] || 0;
  const monsterNames = task.m.map(id => MONSTERS[id]?.name || id).join(', ');
  emit(EVENTS.NOTIFY, { msg: t('tasks.started', { required: task.n, monster: monsterNames }), type: 'success' });
  emit(EVENTS.TASKS_PANEL);
  saveGame();
}

// Credita a parte CLIENT-SIDE dos rewards (só taskCoin — não está em
// ECONOMY_FIELDS, não é revertido pelo reconcile) e monta o resumo textual pro
// log/notificação. xp/gold já foram concedidos pelo servidor (server-authoritative);
// aqui só espelhamos os valores dele. `granted.grantedItems` traz a nova qty de
// cada item que o servidor creditou (cobre item e o randomItem que ele sorteou).
function applyTaskRewards(rewards, granted) {
  const parts = [];
  for (const r of rewards || []) {
    if (!r) continue;
    if (r.type === 'xp') parts.push(`+${r.amount.toLocaleString()} XP`);
    else if (r.type === 'gold') parts.push(`+${r.amount.toLocaleString()} Gold`);
    else if (r.type === 'taskCoin') { G.taskCoins += r.qty; parts.push(`+${r.qty} Task Coin${r.qty > 1 ? 's' : ''}`); }
  }
  for (const gi of (granted?.grantedItems || [])) {
    G.inventory[gi.itemId] = gi.qty; // qty é o total atualizado que o servidor devolveu
    if (!G.inventoryOrder.includes(gi.itemId)) G.inventoryOrder.push(gi.itemId);
    parts.push(`+${ITEMS[gi.itemId]?.name || gi.itemId}`);
  }
  return parts.join(', ');
}

// Ao bater o alvo, a task NÃO credita nada — fica "pronta pra coletar". O jogador
// coleta pelo painel (claimTaskReward), como no RubinOT. Isso também fecha o
// double-grant antigo: a coleta é um clique único e server-authoritative.
function checkTaskProgress() {
  if (!G.activeTask) return;
  const { key, required } = G.activeTask;
  const kills = G.taskKills[key] || 0;
  if (kills >= required && !G.activeTask.ready) {
    G.activeTask.ready = true;
    emit(EVENTS.NOTIFY, { msg: t('tasks.readyToClaim'), type: 'success' });
    emit(EVENTS.TASKS_PANEL);
    saveGame();
  }
  emit(EVENTS.ACTIVE_TASK);
}

// Coleta a recompensa da task pronta — SERVER-AUTHORITATIVE. O /task/complete
// valida (mortes reais + gate de desbloqueio), avança a completion e CONCEDE
// xp/gold/item de fato; aqui só espelhamos o que ele devolveu. Guard de
// reentrância impede clique duplo enquanto o request está em voo.
let claimingTask = false;
export async function claimTaskReward() {
  if (!G.activeTask || !G.activeTask.ready || claimingTask) return;
  const { roomId, taskIndex, key } = G.activeTask;
  const found = findTask(roomId, taskIndex);
  if (!found) { G.activeTask = null; emit(EVENTS.TASKS_PANEL); emit(EVENTS.ACTIVE_TASK); return; }
  claimingTask = true;
  try {
    const { task } = found;
    const prevLevel = G.level;
    const res = await completeTaskOnServer(ACCOUNT.activeSlot, roomId, taskIndex);
    if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
    G.taskCompletion = res.completion;
    // Valores autoritativos do servidor (xp é o do nível atual; level já recalculado).
    if (res.gold != null) G.gold = res.gold;
    if (res.totalGoldEarned != null) G.totalGoldEarned = res.totalGoldEarned;
    if (res.xp != null) G.xp = res.xp;
    if (res.level != null) G.level = res.level;
    const rewards = res.firstTime ? [...(task.firstReward || []), ...(task.repeatReward || [])] : (task.repeatReward || []);
    const summary = applyTaskRewards(rewards, res);
    if (G.level > prevLevel) { G.hp = getMaxHp(); G.mana = getMaxMana(); emit(EVENTS.LEVEL_UP, { level: G.level }); }
    bumpMissionProgress('tasks', 1);
    emit(EVENTS.NOTIFY, { msg: t(res.firstTime ? 'tasks.completeFirstTime' : 'tasks.completeRepeat', { rewards: summary }), type: 'success' });
    emit(EVENTS.LOG, `<span class="${res.firstTime ? 'log-heal' : 'log-loot'}">${t(res.firstTime ? 'tasks.logCompleteFirstTime' : 'tasks.logComplete', { task: task.name })}</span>`);
    G.taskKills[key] = 0;
    G.activeTask = null;
    emit(EVENTS.TASKS_PANEL);
    emit(EVENTS.HEADER_STATS);
    emit(EVENTS.CHAR_INFO);
    emit(EVENTS.BARS);
    emit(EVENTS.INVENTORY);
    saveGame();
  } finally {
    claimingTask = false;
  }
  emit(EVENTS.ACTIVE_TASK);
}

export function cancelTask() {
  // Zera o progresso ao cancelar — sem isto, G.taskKills[key] sobrevivia e o
  // startTask (que faz `|| 0`) reaproveitava a contagem: matar 99/100, cancelar
  // e reativar completava a task na 1ª morte da nova tentativa (banca de progresso).
  if (G.activeTask) G.taskKills[G.activeTask.key] = 0;
  G.activeTask = null;
  emit(EVENTS.TASKS_PANEL);
  emit(EVENTS.NOTIFY, { msg: t('tasks.cancelled'), type: 'error' });
  saveGame();
}

on(EVENTS.MONSTER_KILLED, ({ monsterId }) => {
  if (G.activeTask && G.activeTask.monsters.includes(monsterId)) {
    G.taskKills[G.activeTask.key] = (G.taskKills[G.activeTask.key] || 0) + 1;
  }
  checkTaskProgress();
});
