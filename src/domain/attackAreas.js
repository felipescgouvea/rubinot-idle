// Áreas de ataque no estilo Tibia. Cada magia/runa de ataque tem uma "forma"
// de área — no Tibia real ela define QUAIS casas do chão são atingidas (alvo
// único, feixe em linha, onda em cone, explosão, bola 3x3, etc.). Aqui, como
// o combate é contra uma "sala" (pack) de criaturas enfrentadas de frente, a
// forma é traduzida em `maxTargets`: quantas criaturas da sala aquele ataque
// acerta de uma vez. Alvo único = 1 (só a da frente); área = a da frente + as
// que estiverem esperando atrás, até o limite da forma.
//
// A referência de cada forma (que casas o Tibia atinge de verdade) está em
// .spec/15-areas-de-ataque.md; `tibia` abaixo resume pra quem lê o código.
export const ATTACK_AREAS = {
  single:    { name: 'Alvo único',        maxTargets: 1, tibia: 'Atinge apenas o alvo à frente (golpe normal, strikes, SD, missile).' },
  beam:      { name: 'Feixe',             maxTargets: 3, tibia: 'Linha reta a partir do conjurador (ex.: Ethereal Spear).' },
  wave:      { name: 'Onda',              maxTargets: 5, tibia: 'Cone/onda à frente (ex.: Fire Wave, Energy Wave, Terra Wave).' },
  explosion: { name: 'Explosão',          maxTargets: 5, tibia: 'Área compacta ao redor do alvo (ex.: Explosion, Fireball).' },
  ball:      { name: 'Área 3x3 (8 sqm)',  maxTargets: 8, tibia: 'Todas as casas ao redor (ex.: exori, Avalanche, GFB, Divine Caldera, Hell\'s Core).' },
};

const DEFAULT = ATTACK_AREAS.single;

export function areaOf(areaId) {
  return ATTACK_AREAS[areaId] || DEFAULT;
}

// Quantas criaturas o ataque acerta (1 = alvo único). O chamador ainda limita
// pelo tamanho real da sala (não dá pra acertar mais bicho do que existe).
export function areaMaxTargets(areaId) {
  return areaOf(areaId).maxTargets;
}

export function areaName(areaId) {
  return areaOf(areaId).name;
}

// Verdadeiro só quando o ataque acerta mais de um alvo (para logs/visual).
export function isAreaAttack(areaId) {
  return areaMaxTargets(areaId) > 1;
}
