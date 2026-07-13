import { G } from '../application/gameStore.js?v=126';
import { MONSTERS } from '../domain/bestiary.js?v=128';
import { TASK_ROOMS, isTaskUnlocked } from '../domain/progression.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { monsterSpriteImg } from './huntPanel.js?v=125';
import { t } from '../i18n/i18n.js?v=127';

// sala N usa a sprite do próprio boss como ícone (o boss dá nome à sala e já
// tem sprite real via SPRITE_OVERRIDE em tibiaSprites.js) — só "corrupted" (id
// da sala) difere de "corrupted_one" (id do monstro) por causa da palavra reservada.
const ROOM_BOSS_ID = { lothlorien: 'lothlorien', executioner: 'executioner', morgul: 'morgul', corrupted: 'corrupted_one', nzoth: 'nzoth' };

export function renderTasksPanel() {
  const roomsEl = document.getElementById('task-rooms');
  roomsEl.innerHTML = TASK_ROOMS.map(room => {
    const roomLocked = G.level < room.minLevel;
    return `
    <div class="task-room" ${roomLocked ? 'style="opacity:0.55"' : ''}>
      <h4>${monsterSpriteImg(ROOM_BOSS_ID[room.id], 'inline-icon')} ${room.name} ${roomLocked ? `— 🔒 ${t('tasks.lockedLevel', { lvl: room.minLevel })}` : ''}</h4>
      ${room.tasks.map((task, i) => {
        const m = MONSTERS[task.m];
        const kills = G.taskKills[task.m] || 0;
        const done = (G.taskCompletion[task.m] || 0);
        const isActive = G.activeTask?.monster === task.m;
        const unlocked = isTaskUnlocked(room, i, G.level, G.taskCompletion);
        return `<div class="task-entry" ${!unlocked ? 'style="opacity:0.45"' : ''}>
          <span class="task-name">${i + 1}. ${monsterSpriteImg(task.m, 'inline-icon')} ${m.name} (${kills}/${task.n})</span>
          <span class="task-status">${done > 0 ? `${done}x ✅` : done === 0 && unlocked ? `<span style="color:#8fc47a">${t('tasks.firstTimeBonus')}</span>` : ''}</span>
          <button class="task-btn ${isActive ? 'done' : ''}" onclick="startTask('${task.m}', ${task.n})" ${isActive || !unlocked ? 'disabled' : ''}>
            ${isActive ? `✓ ${t('tasks.active')}` : unlocked ? t('tasks.start') : '🔒'}
          </button>
        </div>`;
      }).join('')}
    </div>
  `; }).join('');

  renderActiveTask();
}

export function renderActiveTask() {
  const el = document.getElementById('active-task-display');
  if (!G.activeTask) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const { monster, required } = G.activeTask;
  const kills = G.taskKills[monster] || 0;
  const pct = Math.min(100, Math.round((kills / required) * 100));
  const m = MONSTERS[monster];
  el.innerHTML = `
    <div class="active-task-header">📋 ${t('tasks.activeTaskLabel')}: ${monsterSpriteImg(monster, 'inline-icon')} ${m.name}</div>
    <div>${t('tasks.killsProgress', { kills, required, pct })}</div>
    <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
    <button onclick="cancelTask()" style="margin-top:6px;background:#e74c3c;border:none;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">${t('tasks.cancelTask')}</button>
  `;
}

export function wireTasksPanelEvents() {
  on(EVENTS.TASKS_PANEL, renderTasksPanel);
  on(EVENTS.ACTIVE_TASK, renderActiveTask);
}
