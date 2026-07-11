// Recompensa Diária (Reward Shrine) — não ocupa uma aba: é um botão no header
// que abre um modal com o ciclo de 7 dias e o botão de resgate. Um "selo"
// vermelho no botão avisa quando há recompensa disponível hoje.
import { DAILY_REWARDS, DAILY_CYCLE, rewardForStreak } from '../domain/dailyReward.js?v=61';
import { on, EVENTS } from '../shared/eventBus.js?v=61';
import { openModal } from './shared.js?v=61';
import { getDailyState, claimDailyReward } from '../application/dailyRewardUseCases.js?v=61';

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
      <div class="daily-day">Dia ${r.day}</div>
      <div class="daily-icon">${r.icon}</div>
      <div class="daily-name">${r.name}</div>
    </div>`;
  }).join('');
  openModal(`
    <h3>🎁 Recompensa Diária</h3>
    <p class="muted">Volte todo dia para manter a sequência. Faltar um dia reinicia o ciclo de 7 dias.</p>
    <div class="daily-grid">${cards}</div>
    <div class="daily-claim-row">
      ${state.canClaim
        ? `<button class="btn-blue daily-claim-btn" onclick="claimDailyReward()">Resgatar dia ${state.streak}: ${todayReward.icon} ${todayReward.name}</button>`
        : `<span class="muted">✅ Recompensa de hoje já resgatada (sequência: dia ${state.streak}). Volte amanhã!</span>`}
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
