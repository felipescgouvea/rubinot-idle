// Recompensa Diária (Reward Shrine) — não ocupa uma aba: é um botão no header
// que abre um modal com o ciclo de 7 dias e o botão de resgate. Um "selo"
// vermelho no botão avisa quando há recompensa disponível hoje.
import { DAILY_REWARDS, DAILY_CYCLE, rewardForStreak } from '../domain/dailyReward.js?v=260';
import { on, EVENTS } from '../shared/eventBus.js?v=261';
import { openModal, goldIconImg, rubiniIconImg } from './shared.js?v=266';
import { getDailyState, claimDailyReward } from '../application/dailyRewardUseCases.js?v=261';
import { t } from '../i18n/i18n.js?v=279';

// Sprite real pro gold/Rubini Coin (mesmo dispatcher do Battle Pass, ver
// ui/battlePassPanel.js: bpRewardIcon); XP Boost e Supply Completo não têm
// item único equivalente no Tibia, ficam de emoji mesmo.
function dailyRewardIcon(r, cls = 'daily-icon-img') {
  if (r.type === 'gold') return goldIconImg(cls);
  if (r.type === 'rubini') return rubiniIconImg(cls);
  return r.icon;
}

// Atualiza o selo "!" do botão do header conforme há ou não resgate hoje.
// getDailyState() agora é assíncrona (consulta o servidor) — sem sessão
// pronta ainda ou request em voo, simplesmente não mexe no selo até resolver.
export async function renderDailyBadge() {
  const badge = document.getElementById('daily-reward-badge');
  if (!badge) return;
  const state = await getDailyState();
  badge.style.display = state.canClaim ? 'flex' : 'none';
}

export async function openDailyReward() {
  openModal(`<h3>🎁 ${t('daily.title')}</h3><p class="muted">${t('market.loading')}</p>`);
  const state = await getDailyState();
  const todayReward = rewardForStreak(state.streak);
  const cards = DAILY_REWARDS.map(r => {
    const isToday = state.canClaim && r.day === ((state.streak - 1) % DAILY_CYCLE) + 1;
    return `<div class="daily-card ${isToday ? 'today' : ''}">
      <div class="daily-day">${t('daily.day', { day: r.day })}</div>
      <div class="daily-icon">${dailyRewardIcon(r)}</div>
      <div class="daily-name">${t(r.name)}</div>
    </div>`;
  }).join('');
  openModal(`
    <h3>🎁 ${t('daily.title')}</h3>
    <p class="muted">${t('daily.intro')}</p>
    <div class="daily-grid">${cards}</div>
    <div class="daily-claim-row">
      ${state.canClaim
        ? `<button class="btn-blue daily-claim-btn" onclick="claimDailyReward()">${t('daily.claimDay', { day: state.streak, icon: dailyRewardIcon(todayReward, 'daily-icon-img-inline'), name: t(todayReward.name) })}</button>`
        : `<span class="muted">✅ ${t('daily.alreadyClaimed', { day: state.streak })}</span>`}
    </div>`);
}

// Após resgatar, re-renderiza o modal (mostra o "já resgatado") e o selo.
function refreshDailyAfterClaim() {
  openDailyReward();
  renderDailyBadge();
}

export function wireDailyRewardEvents() {
  on(EVENTS.DAILY_REWARD_PANEL, refreshDailyAfterClaim);
}
