// Painel de Achievements + seleção de Título. Modal aberto pelo botão 🏆 na
// barra do personagem. As conquistas são recomputadas dos stats (autoritativos)
// a cada abertura — nada persistido além do título escolhido (G.title).
import { G } from '../application/gameStore.js?v=322';
import { ACHIEVEMENTS, isAchievementUnlocked, availableTitles } from '../domain/achievements.js?v=318';
import { spriteUrl, spriteImgOrFallback } from '../infrastructure/tibiaSprites.js?v=323';
import { openModal } from './shared.js?v=325';
import { emit, EVENTS } from '../shared/eventBus.js?v=320';
import { saveGame } from '../application/saveGameUseCase.js?v=322';
import { t } from '../i18n/i18n.js?v=338';

function achievementsHtml() {
  const unlocked = ACHIEVEMENTS.filter(a => isAchievementUnlocked(a, G));
  const titles = availableTitles(G);
  const rows = ACHIEVEMENTS.map(a => {
    const on = isAchievementUnlocked(a, G);
    return `<div class="ach-row ${on ? 'on' : 'off'}">
      <span class="ach-icon">${on ? spriteImgOrFallback(spriteUrl(a.sprite), a.name, a.icon, 'ach-icon-img') : '🔒'}</span>
      <span class="ach-text"><b>${a.name}</b><small>${a.desc}${a.title ? ` · ${t('achiev.titleLabel', { title: a.title })}` : ''}</small></span>
      ${on ? '<span class="ach-check">✓</span>' : ''}
    </div>`;
  }).join('');
  const titleBtns = ['<button class="ach-title-btn ' + (!G.title ? 'active' : '') + '" onclick="setPlayerTitle(\'\')">' + t('achiev.noTitle') + '</button>']
    .concat(titles.map(tt => `<button class="ach-title-btn ${G.title === tt ? 'active' : ''}" onclick="setPlayerTitle('${tt.replace(/'/g, "\\'")}')">${tt}</button>`))
    .join(' ');
  return `
    <h3>${spriteImgOrFallback(spriteUrl('items/Golden_Goblet.webp'), 'achievements', '🏆', 'inline-title-icon')} ${t('achiev.title')} <span class="muted" style="font-size:12px">(${unlocked.length}/${ACHIEVEMENTS.length})</span></h3>
    <div class="ach-titles">
      <div class="muted" style="font-size:12px;margin-bottom:4px">${t('achiev.displayedTitle')}${titles.length ? '' : t('achiev.noTitlesHint')}:</div>
      ${titleBtns}
    </div>
    <div class="ach-list">${rows}</div>`;
}

export function openAchievements() {
  openModal(achievementsHtml());
}

export function setPlayerTitle(title) {
  // Achado de auditoria: aceitava qualquer string sem checar se o título
  // foi realmente ganho por uma conquista (só cosmético, mas ainda assim
  // permitia forjar um texto arbitrário ao lado do nome). Título só entra
  // se estiver na lista de availableTitles(G), derivada das conquistas
  // reais (que por sua vez usam stats autoritativos).
  if (title && !availableTitles(G).includes(title)) return;
  G.title = title || null;
  saveGame();
  emit(EVENTS.CHAR_INFO);
  openModal(achievementsHtml()); // re-render pra destacar o selecionado
}
