// Bênçãos (Blessings) — como no Tibia: compradas com gold, reduzem a perda de
// XP na morte e fazem reviver com mais vida. Ao morrer, as bênçãos são
// CONSUMIDAS (é preciso recomprar). Sem bênção, a morte dói o máximo.

export const MAX_BLESSINGS = 5;

// Preço de UMA bênção — escala com o nível (quanto mais alto, mais caro), pra
// virar um ralo de gold relevante no fim do jogo.
export function blessingCost(level) {
  return Math.floor(200 + (level || 1) * 120);
}

// FRAÇÃO da XP TOTAL perdida na morte — FÓRMULA REAL do Crystal Server
// (Player::getLostPercent, src/creatures/players/player.cpp). Escala com o
// nível: 10% abaixo do nível 24, caindo pra ~4,5% no 100 (porque o numerador
// cresce mais devagar que a XP total). Cada bênção corta 8% da perda; promoção
// corta mais 30%. Substitui os 5% fixos antigos (pedido do Felipe: sem desvio).
//
// Aplica-se sobre o XP TOTAL acumulado — quem chama pode DE-LEVELAR, como no
// Tibia. `levelPercent` é o progresso (0-100) dentro do nível atual; `totalExp`
// é a XP total acumulada.
export function deathXpLossPct(level, blessings = 0, promoted = false, levelPercent = 0, totalExp = 0) {
  const blessingCount = Math.min(MAX_BLESSINGS, blessings || 0);
  let percentReduction = (blessingCount * 8) / 100;   // 8% por bênção (fator não-retro do CS)
  let lossPercent;
  if (level >= 24) {
    const tmp = level + (levelPercent || 0) / 100;
    lossPercent = totalExp > 0
      ? ((tmp + 50) * 50 * ((tmp * tmp) - (5 * tmp) + 8)) / totalExp
      : 0;
  } else {
    if (percentReduction >= 0.40) percentReduction = 0.50;
    lossPercent = 10;
  }
  if (promoted) percentReduction += 0.30;
  const pct = Math.max(0, lossPercent - lossPercent * percentReduction);   // em %
  return pct / 100;                                                        // fração do XP total
}

// % de HP com que o personagem revive. Base 30%; +6% por bênção (até 60%).
export function reviveHpPct(blessings) {
  return Math.min(1, 0.3 + 0.06 * Math.min(MAX_BLESSINGS, blessings || 0));
}
