// Bestiário e Charms — inspirado no Bestiary/Charm System do Tibia. Matar
// criaturas preenche o bestiário por etapas; completar etapas dá Charm Points,
// gastos pra desbloquear charms que dão bônus passivos de combate. Regras
// puras: nada aqui toca DOM, storage ou G (a contagem de mortes vem de
// G.killCounters, passada pelos casos de uso).

// Etapas de progresso do bestiário por criatura (contagem acumulada de mortes)
// — 3 estágios, fiel ao Tibia real. Os Charm Points só são pagos quando o
// ÚLTIMO estágio (III) é concluído, não em cada etapa cruzada — matar até a
// etapa II não paga nada ainda, só a soma inteira quando a criatura fica
// 100% completa no bestiário (ver charmPointsForKills abaixo).
export const BESTIARY_STAGES = [
  { kills: 10,   charmPoints: 5,  label: 'I' },
  { kills: 50,   charmPoints: 10, label: 'II' },
  { kills: 250,  charmPoints: 15, label: 'III' },
];

// Quantas etapas do bestiário uma criatura já tem completas, dada a contagem
// de mortes.
export function bestiaryStagesCompleted(kills) {
  return BESTIARY_STAGES.filter(s => kills >= s.kills).length;
}

// Charm Points de uma criatura: 0 até completar TODOS os estágios (o último,
// III) — só então paga a soma cheia dos 3 de uma vez, nunca parcial.
export function charmPointsForKills(kills) {
  const last = BESTIARY_STAGES[BESTIARY_STAGES.length - 1];
  if (kills < last.kills) return 0;
  return BESTIARY_STAGES.reduce((sum, s) => sum + s.charmPoints, 0);
}

export function nextBestiaryStage(kills) {
  return BESTIARY_STAGES.find(s => kills < s.kills) || null;
}

// Charms desbloqueáveis com Charm Points. Cada um dá um bônus passivo GLOBAL
// enquanto estiver equipado (no Tibia o charm é atribuído a uma criatura e
// dispara em combate; aqui é um passivo global pra caber no modelo idle).
// `effect` casa com uma chave agregada em application/bonuses.js. `name` é o
// nome real do charm em Tibia (não muda por idioma — ver .spec e o pedido de
// padronizar naming com Tibia); `desc` é chave de tradução (ver ui/bestiaryPanel.js
// e i18n/locales/*.js: charm.<id>.desc), porque é texto original deste jogo.
export const CHARMS = {
  wound:    { name: 'Wound',    icon: '🩸', cost: 600,  effect: 'damage',   value: 0.05, desc: 'charm.wound.desc' },
  enflame:  { name: 'Enflame',  icon: '🔥', cost: 1000, effect: 'damage',   value: 0.08, desc: 'charm.enflame.desc' },
  scavenge: { name: 'Scavenge', icon: '🍀', cost: 800,  effect: 'loot',     value: 0.10, desc: 'charm.scavenge.desc' },
  gut:      { name: 'Gut',      icon: '💰', cost: 800,  effect: 'gold',     value: 0.15, desc: 'charm.gut.desc' },
  divine:   { name: 'Divine',   icon: '⭐', cost: 1200, effect: 'xp',       value: 0.10, desc: 'charm.divine.desc' },
  vampiric: { name: 'Vampiric', icon: '🧛', cost: 1500, effect: 'lifeleech', value: 0.05, desc: 'charm.vampiric.desc' },
};

// Quantos charms podem ficar equipados ao mesmo tempo.
export const CHARM_EQUIP_SLOTS = 3;
