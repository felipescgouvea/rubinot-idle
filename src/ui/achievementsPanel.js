// Painel de Achievements + seleção de Título. Modal aberto pelo botão 🏆 na
// barra do personagem. As conquistas são recomputadas dos stats (autoritativos)
// a cada abertura — nada persistido além do título escolhido (G.title).
import { G } from '../application/gameStore.js?v=157';
import { ACHIEVEMENTS, isAchievementUnlocked, availableTitles } from '../domain/achievements.js?v=153';
import { openModal } from './shared.js?v=160';
import { emit, EVENTS } from '../shared/eventBus.js?v=155';
import { saveGame } from '../application/saveGameUseCase.js?v=157';

function achievementsHtml() {
  const unlocked = ACHIEVEMENTS.filter(a => isAchievementUnlocked(a, G));
  const titles = availableTitles(G);
  const rows = ACHIEVEMENTS.map(a => {
    const on = isAchievementUnlocked(a, G);
    return `<div class="ach-row ${on ? 'on' : 'off'}">
      <span class="ach-icon">${on ? a.icon : '🔒'}</span>
      <span class="ach-text"><b>${a.name}</b><small>${a.desc}${a.title ? ` · título: “${a.title}”` : ''}</small></span>
      ${on ? '<span class="ach-check">✓</span>' : ''}
    </div>`;
  }).join('');
  const titleBtns = ['<button class="ach-title-btn ' + (!G.title ? 'active' : '') + '" onclick="setPlayerTitle(\'\')">Sem título</button>']
    .concat(titles.map(tt => `<button class="ach-title-btn ${G.title === tt ? 'active' : ''}" onclick="setPlayerTitle('${tt.replace(/'/g, "\\'")}')">${tt}</button>`))
    .join(' ');
  return `
    <h3>🏆 Achievements <span class="muted" style="font-size:12px">(${unlocked.length}/${ACHIEVEMENTS.length})</span></h3>
    <div class="ach-titles">
      <div class="muted" style="font-size:12px;margin-bottom:4px">Título exibido${titles.length ? '' : ' — desbloqueie conquistas com título'}:</div>
      ${titleBtns}
    </div>
    <div class="ach-list">${rows}</div>`;
}

export function openAchievements() {
  openModal(achievementsHtml());
}

export function setPlayerTitle(title) {
  G.title = title || null;
  saveGame();
  emit(EVENTS.CHAR_INFO);
  openModal(achievementsHtml()); // re-render pra destacar o selecionado
}
