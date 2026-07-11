// Linked Tasks: iniciar, progredir e cancelar. Escuta MONSTER_KILLED (emitido
// pela caçada) em vez de a caçada chamar isto diretamente — a caçada não
// precisa saber que tasks existem, só anuncia mortes.
import { G } from './gameStore.js?v=22';
import { MONSTERS } from '../domain/bestiary.js?v=22';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=22';
import { gainXp } from './huntUseCases.js?v=22';
import { saveGame } from './saveGameUseCase.js?v=22';

export function startTask(monsterId, required) {
  if (G.activeTask) {
    emit(EVENTS.NOTIFY, { msg: 'Só uma task ativa por vez (como no RubinOT). Cancele a atual primeiro.', type: 'error' });
    return;
  }
  G.activeTask = { monster: monsterId, required, started: Date.now() };
  G.taskKills[monsterId] = G.taskKills[monsterId] || 0;
  emit(EVENTS.NOTIFY, { msg: `Task iniciada: ${required}x ${MONSTERS[monsterId].name}`, type: 'success' });
  emit(EVENTS.TASKS_PANEL);
  saveGame();
}

export function checkTaskProgress() {
  if (!G.activeTask) return;
  const { monster, required } = G.activeTask;
  const kills = G.taskKills[monster] || 0;
  if (kills >= required) {
    const firstTime = (G.taskCompletion[monster] || 0) === 0;
    G.taskCompletion[monster] = (G.taskCompletion[monster] || 0) + 1;
    // Recompensa exclusiva de 1ª vez (verde) vs repetível (vermelha), como no RubinOT
    const mult = firstTime ? 2 : 1;
    const goldReward = required * 5 * mult;
    const xpReward = required * 20 * mult;
    const rcReward = firstTime ? 25 : 10;
    G.gold += goldReward;
    gainXp(xpReward);
    G.rubini += rcReward;
    emit(EVENTS.NOTIFY, { msg: `${firstTime ? '🟢 1ª VEZ! ' : '🔴 '}Task completa! +${goldReward} 💰, +${xpReward} XP, +${rcReward} RC`, type: 'success' });
    emit(EVENTS.LOG, `<span class="${firstTime ? 'log-heal' : 'log-loot'}">📜 Task ${MONSTERS[monster].name} completa${firstTime ? ' (bônus de primeira vez!)' : ''} — próxima task da sala desbloqueada.</span>`);
    G.taskKills[monster] = 0;
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
  emit(EVENTS.NOTIFY, { msg: 'Tarefa cancelada.', type: 'error' });
  saveGame();
}

on(EVENTS.MONSTER_KILLED, ({ monsterId }) => {
  if (G.activeTask && G.activeTask.monster === monsterId) {
    G.taskKills[G.activeTask.monster] = (G.taskKills[G.activeTask.monster] || 0) + 1;
  }
  checkTaskProgress();
});
