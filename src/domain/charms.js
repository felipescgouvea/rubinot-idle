// Bestiário e Charms — inspirado no Bestiary/Charm System do Tibia. Matar
// criaturas preenche o bestiário por etapas; completar etapas dá Charm Points,
// gastos pra desbloquear charms que dão bônus passivos de combate. Regras
// puras: nada aqui toca DOM, storage ou G (a contagem de mortes vem de
// G.killCounters, passada pelos casos de uso).

// Etapas de progresso do bestiário por criatura (contagem acumulada de mortes).
// Cada etapa alcançada concede Charm Points uma única vez. No Tibia as etapas
// variam por dificuldade; aqui usamos limiares fixos e proporcionais, mais
// curtos que os oficiais por ser um idle.
export const BESTIARY_STAGES = [
  { kills: 10,   charmPoints: 5,  label: 'I' },
  { kills: 50,   charmPoints: 10, label: 'II' },
  { kills: 250,  charmPoints: 15, label: 'III' },
  { kills: 1000, charmPoints: 25, label: 'IV' },
];

// Quantas etapas do bestiário uma criatura já tem completas, dada a contagem
// de mortes — e quantos Charm Points isso representa no total.
export function bestiaryStagesCompleted(kills) {
  return BESTIARY_STAGES.filter(s => kills >= s.kills).length;
}

export function charmPointsForKills(kills) {
  return BESTIARY_STAGES.reduce((sum, s) => sum + (kills >= s.kills ? s.charmPoints : 0), 0);
}

export function nextBestiaryStage(kills) {
  return BESTIARY_STAGES.find(s => kills < s.kills) || null;
}

// Charms desbloqueáveis com Charm Points. Cada um dá um bônus passivo GLOBAL
// enquanto estiver equipado (no Tibia o charm é atribuído a uma criatura e
// dispara em combate; aqui é um passivo global pra caber no modelo idle).
// `effect` casa com uma chave agregada em application/bonuses.js.
export const CHARMS = {
  wound:    { name: 'Ferida',    tibia: 'Wound',    icon: '🩸', cost: 600,  effect: 'damage',   value: 0.05, desc: '+5% de dano em toda caçada.' },
  enflame:  { name: 'Inflamar',  tibia: 'Enflame',  icon: '🔥', cost: 1000, effect: 'damage',   value: 0.08, desc: '+8% de dano em toda caçada.' },
  scavenge: { name: 'Vasculhar', tibia: 'Scavenge', icon: '🍀', cost: 800,  effect: 'loot',     value: 0.10, desc: '+10% de chance de loot.' },
  gut:      { name: 'Estripar',  tibia: 'Gut',      icon: '💰', cost: 800,  effect: 'gold',     value: 0.15, desc: '+15% de gold por criatura.' },
  divine:   { name: 'Divindade', tibia: 'Divine',   icon: '⭐', cost: 1200, effect: 'xp',       value: 0.10, desc: '+10% de XP por criatura.' },
  vampiric: { name: 'Vampírico', tibia: 'Vampiric', icon: '🧛', cost: 1500, effect: 'lifeleech', value: 0.05, desc: 'Cura 5% do dano causado.' },
};

// Quantos charms podem ficar equipados ao mesmo tempo.
export const CHARM_EQUIP_SLOTS = 3;
