// Caso de uso da Recompensa Diária (login streak). Ver domain/dailyReward.js
// pra as regras puras de ciclo/streak — mas o ESTADO (canClaim/streak) e a
// aplicação da recompensa agora são autoritativos no servidor (ver
// server/src/index.js: /daily-reward/state e /daily-reward/claim); este
// arquivo só chama as rotas e mantém um cache local (G.dailyLastClaim/
// G.dailyStreak) pra feedback visual entre reloads.
import { G, ACCOUNT } from './gameStore.js?v=178';
import { fetchDailyRewardState, claimDailyRewardOnServer } from '../infrastructure/authClient.js';
import { emit, EVENTS } from '../shared/eventBus.js?v=176';
import { saveGame } from './saveGameUseCase.js?v=178';
import { t } from '../i18n/i18n.js?v=192';

export async function getDailyState() {
  const result = await fetchDailyRewardState(ACCOUNT.activeSlot);
  if (!result.ok) return { canClaim: false, streak: G.dailyStreak || 1 };
  return { canClaim: result.canClaim, streak: result.streak };
}

// Concede a recompensa de hoje (o servidor decide o valor real e aplica em
// player_stats) — idempotente por dia: se já resgatou hoje, notifica e para.
export async function claimDailyReward() {
  // Precisamos do `streak` de HOJE pra mensagem de log/notificação — o
  // servidor não devolve isso em /daily-reward/claim (só a recompensa já
  // aplicada), então lemos o estado uma vez antes (mesmo streak que o claim
  // vai usar, já que ninguém mais escreve nessa linha entre as duas chamadas).
  const state = await getDailyState();
  if (!state.canClaim) {
    emit(EVENTS.NOTIFY, { msg: t('daily.alreadyClaimed', { day: state.streak }), type: 'error' });
    return;
  }
  const result = await claimDailyRewardOnServer(ACCOUNT.activeSlot);
  if (!result.ok) {
    emit(EVENTS.NOTIFY, { msg: result.error === 'já resgatado hoje' ? t('daily.alreadyClaimed', { day: state.streak }) : result.error, type: 'error' });
    return;
  }
  const { reward } = result;
  // Valores FINAIS pós-aplicação vêm do servidor — substitui, não soma.
  if (result.gold != null) G.gold = result.gold;
  if (result.rubini != null) G.rubini = result.rubini;
  if (result.hp != null) G.hp = result.hp;
  if (result.mana != null) G.mana = result.mana;
  if (result.boosts != null) G.boosts = result.boosts;

  // Cache visual local (dia do ciclo já resgatado hoje) — a fonte de verdade
  // pro próximo canClaim/streak é sempre /daily-reward/state, não isto.
  G.dailyLastClaim = new Date().toISOString().slice(0, 10);
  G.dailyStreak = state.streak;

  emit(EVENTS.NOTIFY, { msg: t('daily.rewardClaimed', { icon: reward.icon, day: state.streak, name: t(reward.name) }), type: 'success' });
  emit(EVENTS.LOG, `<span class="log-loot">${t('daily.logClaimed', { day: state.streak, name: t(reward.name) })}</span>`);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.DAILY_REWARD_PANEL);
  saveGame();
}
