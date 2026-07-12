// Caso de uso da Recompensa Diária (login streak). Ver domain/dailyReward.js
// pra as regras puras de ciclo/streak.
import { G } from './gameStore.js?v=85';
import { dailyRewardState, rewardForStreak } from '../domain/dailyReward.js?v=85';
import { isBoostActive } from '../domain/shopCatalog.js?v=85';
import { emit, EVENTS } from '../shared/eventBus.js?v=85';
import { getMaxHp, getMaxMana } from './stats.js?v=85';
import { saveGame } from './saveGameUseCase.js?v=85';

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
    emit(EVENTS.NOTIFY, { msg: 'Você já resgatou a recompensa de hoje. Volte amanhã!', type: 'error' });
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

  emit(EVENTS.NOTIFY, { msg: `${reward.icon} Recompensa do dia ${state.streak}: ${reward.name}!`, type: 'success' });
  emit(EVENTS.LOG, `<span class="log-loot">🎁 Recompensa diária (dia ${state.streak} da sequência): ${reward.name}.</span>`);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.DAILY_REWARD_PANEL);
  saveGame();
}
