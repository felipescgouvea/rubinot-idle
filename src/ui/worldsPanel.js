import { G } from '../application/gameStore.js?v=88';
import { WORLDS } from '../domain/progression.js?v=88';
import { on, EVENTS } from '../shared/eventBus.js?v=88';

export function renderWorldsPanel() {
  const grid = document.getElementById('worlds-grid');
  grid.innerHTML = WORLDS.map(w => {
    const unlocked = G.level >= w.reqLevel;
    const active = G.currentWorld === w.id;
    return `<div class="world-card ${active ? 'active-world' : ''} ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `selectWorld('${w.id}')` : ''}">
      <div class="world-icon">${w.icon}</div>
      <div class="world-name">${w.name} ${active ? '✓' : ''}</div>
      <div class="world-type">${w.type} — ${w.players.toLocaleString()} jogadores</div>
      <div class="world-bonus">🎁 ${w.bonus}</div>
      ${!unlocked ? `<div class="world-req">🔒 Requer Nível ${w.reqLevel}</div>` : ''}
    </div>`;
  }).join('');
}

export function wireWorldsPanelEvents() {
  on(EVENTS.WORLDS_PANEL, renderWorldsPanel);
}
