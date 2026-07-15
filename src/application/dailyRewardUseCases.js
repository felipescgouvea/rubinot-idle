// Caso de uso da Recompensa Diária (login streak). Ver domain/dailyReward.js
// pra as regras puras de ciclo/streak.
import { G } from './gameStore.js?v=126';
import { dailyRewardState, rewardForStreak } from '../domain/dailyReward.js?v=125';
import { isBoostActive } from '../domain/shopCatalog.js?v=127';
import { emit, EVENTS } from '../shared/eventBus.js?v=126';
import { getMaxHp, getMaxMana } from './stats.js?v=125';
import { saveGame } from './saveGameUseCase.js?v=126';
import { t } from '../i18n/i18n.js?v=135';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyState() {
  return dailyRewardState(G.dailyLastClaim, G.dailyStreak, todayStr());
}

// Concede a recompensa de hoje (mesmo formato type/amount das outras telas) e
// avança o streak. Idempotente por dia: se já resgatou hoje, não faz nada.
export function claimDailyReward() {
  const state = getDailyState();
  if (!state.canClaim) {
    emit(EVENTS.NOTIFY, { msg: t('daily.alreadyClaimed', { day: state.streak }), type: 'error' });
    return;
  }
  const reward = rewardForStreak(state.streak);
  G.dailyLastClaim = todayStr();
  G.dailyStreak = state.streak;

  if (reward.type === 'gold') {
    G.gold += reward.amount;
  } else if (reward.type === 'rubini') {
    G.rubini += reward.amount;
  } else if (reward.type === 'refill') {
    G.hp = getMaxHp();
    G.mana = getMaxMana();
  } else if (reward.type === 'boost') {
    const now = Date.now();
    const base = isBoostActive(G.boosts, reward.boost, now) ? G.boosts[reward.boost] : now;
    G.boosts[reward.boost] = base + reward.minutes * 60000;
  }

  emit(EVENTS.NOTIFY, { msg: t('daily.rewardClaimed', { icon: reward.icon, day: state.streak, name: reward.name }), type: 'success' });
  emit(EVENTS.LOG, `<span class="log-loot">${t('daily.logClaimed', { day: state.streak, name: reward.name })}</span>`);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.DAILY_REWARD_PANEL);
  saveGame();
}
