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
// `name` é chave de tradução (ver ui/rtcPanel.js e i18n/locales/*.js: area.<id>)
// — descreve a forma do ataque pro jogador, não é termo canônico de Tibia
// (isso é o campo `tibia`, comentário técnico de referência).
export const ATTACK_AREAS = {
  single:    { name: 'area.single',    maxTargets: 1,  tibia: 'Atinge apenas o alvo à frente (golpe normal, strikes, SD, missile, Fireball).' },
  beam:      { name: 'area.beam',      maxTargets: 3,  tibia: 'Linha reta a partir do conjurador (ex.: Ethereal Spear, Energy Beam).' },
  wave:      { name: 'area.wave',      maxTargets: 5,  tibia: 'Cone/onda à frente (ex.: Fire Wave, Energy Wave, Terra Wave, Front Sweep).' },
  explosion: { name: 'area.explosion', maxTargets: 5,  tibia: 'Cruz compacta ao redor do alvo (ex.: Explosion Rune).' },
  square:    { name: 'area.square',    maxTargets: 8,  tibia: 'As 8 casas ao redor do conjurador (ex.: Berserk, Fierce Berserk).' },
  ball:      { name: 'area.ball',      maxTargets: 12, tibia: 'Losango bem maior ao redor do conjurador — cobre até 36 casas ou mais (ex.: Groundshaker, Divine Caldera, Avalanche, Great Fireball, Hell\'s Core, Eternal Winter, Rage of the Skies, Wrath of Nature).' },
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

// `t` é o tradutor injetado (ver domain/items.js pro mesmo padrão) — sem ele,
// devolve a chave crua (só acontece se algum chamador esquecer de passar).
export function areaName(areaId, t) {
  const key = areaOf(areaId).name;
  return t ? t(key) : key;
}

// Verdadeiro só quando o ataque acerta mais de um alvo (para logs/visual).
export function isAreaAttack(areaId) {
  return areaMaxTargets(areaId) > 1;
}
