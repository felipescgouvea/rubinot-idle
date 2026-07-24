// Linked Tasks: iniciar, progredir e cancelar. Escuta MONSTER_KILLED (emitido
// pela caçada) em vez de a caçada chamar isto diretamente — a caçada não
// precisa saber que tasks existem, só anuncia mortes.
import { G } from './gameStore.js?v=251';
import { MONSTERS } from '../domain/bestiary.js?v=269';
import { ITEMS } from '../domain/items.js?v=262';
import { TASK_ROOMS, taskKey, isTaskUnlocked, isRoomUnlocked } from '../domain/progression.js?v=250';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=249';
import { gainXp } from './huntUseCases.js?v=315';
import { bumpMissionProgress } from './battlePassUseCases.js?v=248';
import { addItemToInventory } from './inventoryCore.js?v=249';
import { saveGame } from './saveGameUseCase.js?v=251';
import { t } from '../i18n/i18n.js?v=265';

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

// Concede uma lista de rewards ({type, amount|itemId|qty|itemIds}) ao jogador.
// Tipos suportados: xp, gold, item, taskCoin, randomItem (sorteia 1 item da
// lista itemIds e credita qty 1). Retorna um resumo textual pro log/notificação.
function grantRewards(rewards) {
  const parts = [];
  for (const r of rewards || []) {
    if (!r) continue;
    if (r.type === 'xp') {
      gainXp(r.amount);
      parts.push(`+${r.amount.toLocaleString()} XP`);
    } else if (r.type === 'gold') {
      G.gold += r.amount;
      G.totalGoldEarned += r.amount;
      parts.push(`+${r.amount.toLocaleString()} Gold`);
    } else if (r.type === 'taskCoin') {
      G.taskCoins += r.qty;
      parts.push(`+${r.qty} Task Coin${r.qty > 1 ? 's' : ''}`);
    } else if (r.type === 'item') {
      const qty = r.qty || 1;
      for (let i = 0; i < qty; i++) addItemToInventory(r.itemId);
      const itemName = ITEMS[r.itemId]?.name || r.itemId;
      parts.push(`+${qty}x ${itemName}`);
    } else if (r.type === 'randomItem') {
      const pool = r.itemIds || [];
      if (pool.length) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        addItemToInventory(picked, 1);
        const itemName = ITEMS[picked]?.name || picked;
        parts.push(`+1x ${itemName}`);
      }
    }
  }
  return parts.join(', ');
}

function checkTaskProgress() {
  if (!G.activeTask) return;
  const { roomId, taskIndex, key, required } = G.activeTask;
  const kills = G.taskKills[key] || 0;
  if (kills >= required) {
    const found = findTask(roomId, taskIndex);
    if (!found) { G.activeTask = null; return; }
    const { task } = found;
    const firstTime = (G.taskCompletion[key] || 0) === 0;
    G.taskCompletion[key] = (G.taskCompletion[key] || 0) + 1;
    // Recompensa exclusiva de 1ª vez (verde) É ADICIONAL à repetível (vermelha):
    // na 1ª conclusão o jogador recebe firstReward + repeatReward juntos; da 2ª
    // em diante só repeatReward — fiel ao padrão real do RubinOT (Linked Tasks).
    const rewards = firstTime ? [...(task.firstReward || []), ...(task.repeatReward || [])] : (task.repeatReward || []);
    const summary = grantRewards(rewards);
    bumpMissionProgress('tasks', 1);
    emit(EVENTS.NOTIFY, { msg: t(firstTime ? 'tasks.completeFirstTime' : 'tasks.completeRepeat', { rewards: summary }), type: 'success' });
    emit(EVENTS.LOG, `<span class="${firstTime ? 'log-heal' : 'log-loot'}">${t(firstTime ? 'tasks.logCompleteFirstTime' : 'tasks.logComplete', { task: task.name })}</span>`);
    G.taskKills[key] = 0;
    G.activeTask = null;
    emit(EVENTS.TASKS_PANEL);
    emit(EVENTS.HEADER_STATS);
    saveGame();
  }
  emit(EVENTS.ACTIVE_TASK);
}

export function cancelTask() {
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
