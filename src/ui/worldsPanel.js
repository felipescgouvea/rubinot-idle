import { G } from '../application/gameStore.js?v=347';
import { WORLDS } from '../domain/progression.js?v=346';
import { on, EVENTS } from '../shared/eventBus.js?v=345';
import { spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=348';
import { uiIcon } from './uiIcons.js?v=348';
import { t } from '../i18n/i18n.js?v=363';

export function renderWorldsPanel() {
  const grid = document.getElementById('worlds-grid');
  grid.innerHTML = WORLDS.map(w => {
    const unlocked = G.level >= w.reqLevel;
    const active = G.currentWorld === w.id;
    return `<div class="world-card ${active ? 'active-world' : ''} ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `selectWorld('${w.id}')` : ''}">
      <div class="world-icon">${spriteImgOrFallback(spriteUrl(w.sprite), w.name, w.icon, 'world-icon-img')}</div>
      <div class="world-name">${w.name} ${active ? '✓' : ''}</div>
      <div class="world-type">${w.type} — ${t('worlds.playersCount', { n: w.players.toLocaleString() })}</div>
      <div class="world-bonus">${uiIcon('daily', 'world-bonus-icon')} ${w.bonus}</div>
      ${!unlocked ? `<div class="world-req">🔒 ${t('worlds.requiresLevel', { lvl: w.reqLevel })}</div>` : ''}
    </div>`;
  }).join('');
}

export function wireWorldsPanelEvents() {
  on(EVENTS.WORLDS_PANEL, renderWorldsPanel);
}
