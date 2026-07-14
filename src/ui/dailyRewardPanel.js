// Recompensa Diária (Reward Shrine) — não ocupa uma aba: é um botão no header
// que abre um modal com o ciclo de 7 dias e o botão de resgate. Um "selo"
// vermelho no botão avisa quando há recompensa disponível hoje.
import { DAILY_REWARDS, DAILY_CYCLE, rewardForStreak } from '../domain/dailyReward.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { openModal, goldIconImg, rubiniIconImg } from './shared.js?v=127';
import { getDailyState, claimDailyReward } from '../application/dailyRewardUseCases.js?v=125';
import { t } from '../i18n/i18n.js?v=135';

// Sprite real pro gold/Rubini Coin (mesmo dispatcher do Battle Pass, ver
// ui/battlePassPanel.js: bpRewardIcon); XP Boost e Supply Completo não têm
// item único equivalente no Tibia, ficam de emoji mesmo.
function dailyRewardIcon(r, cls = 'daily-icon-img') {
  if (r.type === 'gold') return goldIconImg(cls);
  if (r.type === 'rubini') return rubiniIconImg(cls);
  return r.icon;
}

// Atualiza o selo "!" do botão do header conforme há ou não resgate hoje.
export function renderDailyBadge() {
  const badge = document.getElementById('daily-reward-badge');
  if (!badge) return;
  badge.style.display = getDailyState().canClaim ? 'flex' : 'none';
}

export function openDailyReward() {
  const state = getDailyState();
  const todayReward = rewardForStreak(state.streak);
  const cards = DAILY_REWARDS.map(r => {
    const isToday = state.canClaim && r.day === ((state.streak - 1) % DAILY_CYCLE) + 1;
    return `<div class="daily-card ${isToday ? 'today' : ''}">
      <div class="daily-day">${t('daily.day', { day: r.day })}</div>
      <div class="daily-icon">${dailyRewardIcon(r)}</div>
      <div class="daily-name">${r.name}</div>
    </div>`;
  }).join('');
  openModal(`
    <h3>🎁 ${t('daily.title')}</h3>
    <p class="muted">${t('daily.intro')}</p>
    <div class="daily-grid">${cards}</div>
    <div class="daily-claim-row">
      ${state.canClaim
        ? `<button class="btn-blue daily-claim-btn" onclick="claimDailyReward()">${t('daily.claimDay', { day: state.streak, icon: dailyRewardIcon(todayReward, 'daily-icon-img-inline'), name: todayReward.name })}</button>`
        : `<span class="muted">✅ ${t('daily.alreadyClaimed', { day: state.streak })}</span>`}
    </div>`);
}

// Após resgatar, re-renderiza o modal (mostra o "já resgatado") e o selo.
export function refreshDailyAfterClaim() {
  openDailyReward();
  renderDailyBadge();
}

export function wireDailyRewardEvents() {
  on(EVENTS.DAILY_REWARD_PANEL, refreshDailyAfterClaim);
}
