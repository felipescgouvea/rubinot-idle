// Recompensa Diária (Daily Reward / Reward Shrine do Tibia) — um prêmio por
// dia de login, com streak crescente ao longo de um ciclo de 7 dias. Regras
// puras: a data atual (string "YYYY-MM-DD") vem de quem chama.

// Ciclo de 7 dias. `type`/`amount` seguem o mesmo formato usado nas outras
// recompensas do jogo (ver application/battlePassUseCases.js: grantReward).
export const DAILY_REWARDS = [
  { day: 1, icon: '💰', name: '1.000 Gold',        type: 'gold',   amount: 1000 },
  { day: 2, icon: '💎', name: '20 Rubini Coins',   type: 'rubini', amount: 20 },
  { day: 3, icon: '🧪', name: 'Supply Completo',   type: 'refill' },
  { day: 4, icon: '💰', name: '3.000 Gold',        type: 'gold',   amount: 3000 },
  { day: 5, icon: '💎', name: '50 Rubini Coins',   type: 'rubini', amount: 50 },
  { day: 6, icon: '⭐', name: 'XP Boost (30 min)', type: 'boost',  boost: 'xp', minutes: 30 },
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
