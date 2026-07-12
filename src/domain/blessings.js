// Bênçãos (Blessings) — como no Tibia: compradas com gold, reduzem a perda de
// XP na morte e fazem reviver com mais vida. Ao morrer, as bênçãos são
// CONSUMIDAS (é preciso recomprar). Sem bênção, a morte dói o máximo.

export const MAX_BLESSINGS = 5;

// Preço de UMA bênção — escala com o nível (quanto mais alto, mais caro), pra
// virar um ralo de gold relevante no fim do jogo.
export function blessingCost(level) {
  return Math.floor(200 + (level || 1) * 120);
}

// % de XP perdida na morte, conforme as bênçãos ativas. Base 5%; cada bênção
// corta 16% dessa perda → com as 5, cai pra ~1%.
export function deathXpLossPct(blessings) {
  return Math.max(0, 0.05 * (1 - 0.16 * Math.min(MAX_BLESSINGS, blessings || 0)));
}

// % de HP com que o personagem revive. Base 30%; +6% por bênção (até 60%).
export function reviveHpPct(blessings) {
  return Math.min(1, 0.3 + 0.06 * Math.min(MAX_BLESSINGS, blessings || 0));
}
