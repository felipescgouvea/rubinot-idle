import { G } from '../application/gameStore.js?v=185';
import { MONSTERS } from '../domain/bestiary.js?v=203';
import { ITEMS } from '../domain/items.js?v=196';
import { TASK_ROOMS, isTaskUnlocked, isRoomUnlocked, taskKey } from '../domain/progression.js?v=184';
import { on, EVENTS } from '../shared/eventBus.js?v=183';
import { monsterSpriteImg } from './huntPanel.js?v=202';
import { itemIconImg, taskCoinIconImg, formatNum } from './shared.js?v=188';
import { t } from '../i18n/i18n.js?v=199';

// sala N usa a sprite do próprio boss como ícone (o boss dá nome à sala e já
// tem sprite real via SPRITE_OVERRIDE em tibiaSprites.js) — só "corrupted" (id
// da sala) difere de "corrupted_one" (id do monstro) por causa da palavra reservada.
const ROOM_BOSS_ID = { lothlorien: 'lothlorien', executioner: 'executioner', morgul: 'morgul', corrupted: 'corrupted_one', nzoth: 'nzoth' };

// Um único reward vira um pedaço de texto/ícone curto pra listagem da task
// (ex.: "🎁 +5.000 XP", "🎁 +10.000 Gold", "🎁 2x Prey Cards", "🎁 1 Task Coin").
function rewardChip(r) {
  if (r.type === 'xp') return `${formatNum(r.amount)} XP`;
  if (r.type === 'gold') return `${itemIconImg('gold_coin', 'reward-icon')}${formatNum(r.amount)}`;
  if (r.type === 'taskCoin') return `${taskCoinIconImg('reward-icon')}${r.qty}`;
  if (r.type === 'item') {
    const name = ITEMS[r.itemId]?.name || r.itemId;
    return `${itemIconImg(r.itemId, 'reward-icon')}${r.qty > 1 ? r.qty + 'x ' : ''}${name}`;
  }
  if (r.type === 'randomItem') {
    return `🎲 ${r.itemIds.map(id => ITEMS[id]?.name || id).join(' / ')}`;
  }
  return '';
}

function rewardsLine(rewards, cls) {
  if (!rewards || !rewards.length) return '';
  return `<div class="task-rewards-row ${cls}">${rewards.map(r => `<span class="reward-chip">${rewardChip(r)}</span>`).join('')}</div>`;
}

let activeTaskRoom = null;

function roomProgress(room) {
  const done = room.tasks.filter((_, i) => (G.taskCompletion[taskKey(room.tasks[i])] || 0) > 0).length;
  return { done, total: room.tasks.length };
}

export function setTaskRoom(roomId) {
  const ri = TASK_ROOMS.findIndex(r => r.id === roomId);
  if (ri < 0 || !isRoomUnlocked(ri, G.taskCompletion)) return;
  activeTaskRoom = roomId;
  renderTasksPanel();
}

function renderRoomTabs() {
  const tabsEl = document.getElementById('task-room-tabs');
  if (!tabsEl) return;
  tabsEl.innerHTML = TASK_ROOMS.map((room, ri) => {
    const { done, total } = roomProgress(room);
    const roomLocked = !isRoomUnlocked(ri, G.taskCompletion);
    return `<button class="admin-subtab-btn ${room.id === activeTaskRoom ? 'active' : ''} ${roomLocked ? 'locked' : ''}" onclick="${roomLocked ? '' : `setTaskRoom('${room.id}')`}">
      ${roomLocked ? '🔒' : monsterSpriteImg(ROOM_BOSS_ID[room.id], 'inline-icon')} ${room.name} <span class="muted">(${done}/${total})</span>
    </button>`;
  }).join('');
}

export function renderTasksPanel() {
  if (!activeTaskRoom) activeTaskRoom = TASK_ROOMS[0]?.id;
  renderRoomTabs();

  const roomsEl = document.getElementById('task-rooms');
  const roomIndex = TASK_ROOMS.findIndex(r => r.id === activeTaskRoom);
  const room = TASK_ROOMS[roomIndex];
  const roomLocked = !room || !isRoomUnlocked(roomIndex, G.taskCompletion);
  roomsEl.innerHTML = !room ? '' : roomLocked ? `
    <p class="muted">🔒 ${t('tasks.roomLocked')}</p>
  ` : `
    <div class="task-card-grid">
      ${room.tasks.map((task, i) => {
        const key = taskKey(task);
        const kills = G.taskKills[key] || 0;
        const done = (G.taskCompletion[key] || 0);
        const isActive = G.activeTask?.roomId === room.id && G.activeTask?.taskIndex === i;
        const unlocked = isTaskUnlocked(room, i, G.taskCompletion);
        const pct = Math.min(100, Math.round((kills / task.n) * 100));
        const monsterCells = task.m.map(id => `<div class="task-card-monster-cell">
          ${monsterSpriteImg(id, 'task-card-monster-icon')}
          <span class="task-card-monster-name">${MONSTERS[id]?.name || id}</span>
        </div>`).join('');
        return `<div class="task-card ${done > 0 ? 'task-card-done' : ''} ${!unlocked ? 'task-card-locked' : ''}">
          <div class="task-card-head">
            <span class="task-card-title">${task.name}</span>
            <span class="task-card-status">${done > 0 ? `${done}x ✅` : unlocked ? `<span class="task-card-first">${t('tasks.firstTimeBonus')}</span>` : '🔒'}</span>
          </div>
          <div class="task-card-monsters">${monsterCells}</div>
          <div class="task-progress-bar-track task-card-bar"><div class="task-progress-bar" style="width:${pct}%"></div></div>
          <div class="task-card-kills">${kills}/${task.n}</div>
          ${rewardsLine(task.firstReward, 'task-reward-first')}
          ${rewardsLine(task.repeatReward, 'task-reward-repeat')}
          <button class="task-btn ${isActive ? 'done' : ''}" onclick="startTask('${room.id}', ${i})" ${isActive || !unlocked ? 'disabled' : ''}>
            ${isActive ? `✓ ${t('tasks.active')}` : unlocked ? t('tasks.start') : '🔒'}
          </button>
        </div>`;
      }).join('')}
    </div>
  `;

  renderActiveTask();
}

function renderActiveTask() {
  const el = document.getElementById('active-task-display');
  if (!G.activeTask) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const { roomId, taskIndex, key, required, monsters } = G.activeTask;
  const room = TASK_ROOMS.find(r => r.id === roomId);
  const task = room?.tasks[taskIndex];
  const kills = G.taskKills[key] || 0;
  const pct = Math.min(100, Math.round((kills / required) * 100));
  const monsterIcons = (monsters || []).map(id => monsterSpriteImg(id, 'inline-icon')).join('');
  el.innerHTML = `
    <div class="active-task-header">📋 ${t('tasks.activeTaskLabel')}: ${task ? task.name : ''} — ${monsterIcons}</div>
    <div>${t('tasks.killsProgress', { kills, required, pct })}</div>
    <div class="task-progress-bar-track"><div class="task-progress-bar" style="width:${pct}%"></div></div>
    <button onclick="cancelTask()" style="margin-top:6px;background:#e74c3c;border:none;color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">${t('tasks.cancelTask')}</button>
  `;
}

export function wireTasksPanelEvents() {
  on(EVENTS.TASKS_PANEL, renderTasksPanel);
  on(EVENTS.ACTIVE_TASK, renderActiveTask);
}
