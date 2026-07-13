// Sistema de Presas (Prey) — inspirado no Prey System do Tibia. O jogador
// escolhe uma criatura já enfrentada e ganha um bônus (dano, XP ou loot)
// contra ela por um tempo. Regras puras: nada aqui toca DOM, storage ou G.

// 3 slots de presa (como no Tibia: 3 slots, os 2 extras seriam premium — aqui
// os 3 já vêm liberados pra simplificar).
export const PREY_SLOTS = 3;

// Duração de uma presa ativa: 2 horas reais, como o ciclo do Tibia. Como o
// jogo tem progresso offline, uma presa "acompanha" a caçada offline enquanto
// não expira.
export const PREY_DURATION_MS = 2 * 60 * 60 * 1000;

// Custo (em gold) pra rerolar o bônus de um slot sem esperar expirar — dá uma
// torneira de gold pra quem quer forçar um bônus melhor agora.
export const PREY_REROLL_COST = 5000;

// Tipos de bônus que uma presa pode conceder. `apply` diz em qual etapa da
// caçada o multiplicador entra (ver application/bonuses.js). `name` é chave
// de tradução (ver ui/bestiaryPanel.js e i18n/locales/*.js) — reaproveita as
// mesmas chaves bestiary.bonusDamage/bonusXp/bonusLoot já usadas na notificação
// de presa travada (ver application/preyUseCases.js).
export const PREY_BONUS_TYPES = {
  damage: { id: 'damage', name: 'bestiary.bonusDamage', icon: '⚔️', apply: 'damage' },
  xp:     { id: 'xp',     name: 'bestiary.bonusXp',     icon: '⭐', apply: 'xp' },
  loot:   { id: 'loot',   name: 'bestiary.bonusLoot',   icon: '🍀', apply: 'loot' },
};

// Faixa de intensidade do bônus por estrelas (1★ a 5★) — sorteada ao travar a
// presa, igual à barra de bônus do Prey real. Damage/XP são multiplicadores
// (+%); loot é chance aditiva (somada à chance base de cada drop).
export const PREY_STAR_PCT = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.30, 5: 0.40 };

export function rollPreyStars() {
  // 1★..5★ com peso decrescente (5★ é raro), estilo Tibia.
  const roll = Math.random();
  if (roll < 0.35) return 1;
  if (roll < 0.65) return 2;
  if (roll < 0.85) return 3;
  if (roll < 0.96) return 4;
  return 5;
}

export function rollPreyBonusType() {
  const ids = Object.keys(PREY_BONUS_TYPES);
  return ids[Math.floor(Math.random() * ids.length)];
}

export function isPreyActive(slot, now) {
  return !!(slot && slot.monster && slot.expires > now);
}
