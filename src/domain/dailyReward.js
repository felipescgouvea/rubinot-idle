// Recompensa Diária (Daily Reward / Reward Shrine do Tibia) — um prêmio por
// dia de login, com streak crescente ao longo de um ciclo de 7 dias. Regras
// puras: a data atual (string "YYYY-MM-DD") vem de quem chama.

// Ciclo de 7 dias. `type`/`amount` seguem o mesmo formato usado nas outras
// recompensas do jogo (ver application/battlePassUseCases.js: grantReward).
// `name`: string literal pra gold/rubini (número+unidade, igual nos dois
// idiomas — mesma convenção do BP_REWARDS em domain/progression.js), ou chave
// de tradução ('daily.reward.*') pra refill/boost, que têm palavras que MUDAM
// por idioma. ui/dailyRewardPanel.js SEMPRE passa `name` por t() antes de
// mostrar — t() cai na própria chave quando não acha tradução, então o
// literal funciona como "chave inexistente" de propósito (ver i18n/i18n.js).
export const DAILY_REWARDS = [
  { day: 1, icon: '💰', name: '1000 Gold',        type: 'gold',   amount: 1000 },
  { day: 2, icon: '💎', name: '20 Rubini Coins',   type: 'rubini', amount: 20 },
  { day: 3, icon: '🧪', name: 'daily.reward.supplyRefill', type: 'refill' },
  { day: 4, icon: '💰', name: '3000 Gold',        type: 'gold',   amount: 3000 },
  { day: 5, icon: '💎', name: '50 Rubini Coins',   type: 'rubini', amount: 50 },
  { day: 6, icon: '⭐', name: 'daily.reward.xpBoost30', type: 'boost',  boost: 'xp', minutes: 30 },
  { day: 7, icon: '👑', name: '100 Rubini Coins',  type: 'rubini', amount: 100 },
];

export const DAILY_CYCLE = DAILY_REWARDS.length;

// Diferença em dias-calendário entre duas datas "YYYY-MM-DD" (a < b => positivo).
function dayDiff(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Decide o estado da recompensa de hoje a partir do último resgate:
//  - canClaim: ainda não resgatou hoje.
//  - streak: dia do ciclo (1..7) que será resgatado hoje. Reseta pra 1 se
//    passou mais de 1 dia sem logar (perdeu a sequência).
export function dailyRewardState(lastClaimDate, lastStreak, todayStr) {
  if (!lastClaimDate) return { canClaim: true, streak: 1 };
  const diff = dayDiff(lastClaimDate, todayStr);
  if (diff <= 0) return { canClaim: false, streak: lastStreak || 1 };
  if (diff === 1) {
    const next = ((lastStreak || 0) % DAILY_CYCLE) + 1;
    return { canClaim: true, streak: next };
  }
  return { canClaim: true, streak: 1 }; // perdeu a sequência
}

export function rewardForStreak(streak) {
  const idx = ((streak - 1) % DAILY_CYCLE);
  return DAILY_REWARDS[idx];
}

// ---- Streak LONGO (dias consecutivos de login, NÃO reinicia no ciclo de 7) ----
// Premia retenção de longo prazo: a cada marco de 30 dias consecutivos, um
// prêmio EXTRA não-material (boost de XP), além da recompensa do dia. Reseta pra
// 1 se perder um dia. Prêmio não-material de propósito (regra de prêmios do jogo).
export const LONG_STREAK_MILESTONE = 30;
export const LONG_STREAK_REWARD = { icon: '🏆', name: 'daily.reward.milestone30', type: 'boost', boost: 'xp', minutes: 120 };

// Novo long_streak DEPOIS de resgatar hoje (chamar só quando canClaim é true).
export function longStreakAfterClaim(lastClaimDate, lastLongStreak, todayStr) {
  if (!lastClaimDate) return 1;
  const diff = dayDiff(lastClaimDate, todayStr);
  if (diff === 1) return (lastLongStreak || 0) + 1;   // dia consecutivo
  return 1;                                            // primeiro dia OU perdeu a sequência
}

// Prêmio de marco quando o novo long_streak bate um múltiplo do marco (30, 60, …).
export function milestoneRewardFor(longStreak) {
  return (longStreak > 0 && longStreak % LONG_STREAK_MILESTONE === 0) ? LONG_STREAK_REWARD : null;
}

// Quantos dias faltam pro próximo marco de 30.
export function daysToNextMilestone(longStreak) {
  const s = longStreak || 0;
  return LONG_STREAK_MILESTONE - (s % LONG_STREAK_MILESTONE);
}
