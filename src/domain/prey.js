// Sistema de Presas (Prey). Regras FIÉIS ao Tibia — conferidas no source do
// Crystal Server (src/io/ioprey.cpp: PreySlot::reloadBonusValue e
// reloadBonusType, mais os valores de config.lua.dist). Regras puras: nada aqui
// toca DOM, storage ou G.
//
// A mecânica central, e o que antes estava errado aqui: a RARIDADE NUNCA CAI.
// Cada reroll sorteia entre (raridade atual + 1) e 10 — ou seja, rerolar é
// progressão garantida, não aposta. Antes o reroll sorteava 1..5 do zero, então
// pagar pra rerolar podia PIORAR o bônus, o oposto do jogo real.

// 3 slots, como no Tibia. Lá o terceiro é premium; aqui os três já vêm
// liberados — é a única liberdade que tomamos de propósito com o sistema.
export const PREY_SLOTS = 3;

// Duração do bônus: 2h (config.lua.dist: preyBonusTime = 2 * 60 * 60).
export const PREY_DURATION_MS = 2 * 60 * 60 * 1000;

// Raridade vai de 1 a 10 (a "barra de estrelas" do painel de prey), não 1 a 5.
export const PREY_MAX_RARITY = 10;

// Reroll da LISTA custa 200 × nível (config.lua.dist: preyRerollPricePerLevel
// = 200). Antes era um valor fixo de 5000, que era proibitivo cedo e irrisório
// depois.
export const PREY_REROLL_PRICE_PER_LEVEL = 200;

// A cada 20h o jogador ganha um reroll de lista de graça
// (config.lua.dist: preyFreeRerollTime = 20 * 60 * 60).
export const PREY_FREE_REROLL_MS = 20 * 60 * 60 * 1000;

// Quatro tipos de bônus, como no Tibia (PreyBonus_t): dano, DEFESA, XP e loot.
// Defesa faltava aqui. `apply` diz em qual etapa da caçada o multiplicador
// entra (ver application/bonuses.js). `name` é chave de tradução.
export const PREY_BONUS_TYPES = {
  damage:  { id: 'damage',  name: 'bestiary.bonusDamage',  icon: '⚔️', apply: 'damage' },
  defense: { id: 'defense', name: 'bestiary.bonusDefense', icon: '🛡️', apply: 'defense' },
  xp:      { id: 'xp',      name: 'bestiary.bonusXp',      icon: '⭐', apply: 'xp' },
  loot:    { id: 'loot',    name: 'bestiary.bonusLoot',    icon: '🍀', apply: 'loot' },
};

// A % do bônus é FÓRMULA da raridade, não tabela (ioprey.cpp:reloadBonusValue):
//   dano    2r + 5   -> 7% a 25%
//   defesa  2r + 10  -> 12% a 30%
//   xp/loot 3r + 10  -> 13% a 40%
export function preyBonusPct(bonusType, rarity) {
  const r = Math.max(1, Math.min(PREY_MAX_RARITY, Math.floor(rarity) || 1));
  if (bonusType === 'damage') return (2 * r + 5) / 100;
  if (bonusType === 'defense') return (2 * r + 10) / 100;
  return (3 * r + 10) / 100;
}

// Sorteio de raridade do Tibia: SEMPRE sobe. Chegando a 9 ou mais, trava em 10.
export function rollPreyRarity(rarityAtual = 0) {
  if (rarityAtual >= 9) return PREY_MAX_RARITY;
  const min = rarityAtual + 1;
  return min + Math.floor(Math.random() * (PREY_MAX_RARITY - min + 1));
}

// Sorteia o tipo do bônus. Na raridade máxima o Tibia GARANTE que o tipo muda
// (o while do reloadBonusType) — senão, quem chegou a 10 rerolaria pra sempre
// no mesmo bônus sem conseguir trocar de efeito.
export function rollPreyBonusType(atual = null, rarity = 0) {
  const ids = Object.keys(PREY_BONUS_TYPES);
  const candidatos = rarity >= PREY_MAX_RARITY && atual
    ? ids.filter(id => id !== atual)
    : ids;
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

// Preço do reroll de lista pelo nível do personagem.
export function preyRerollCost(level) {
  return PREY_REROLL_PRICE_PER_LEVEL * Math.max(1, Math.floor(level) || 1);
}

// Reroll grátis disponível? (20h desde o último).
export function freeRerollReady(lastFreeAt, now = Date.now()) {
  return now - (Number(lastFreeAt) || 0) >= PREY_FREE_REROLL_MS;
}

export function isPreyActive(slot, now) {
  return !!(slot && slot.monster && slot.expires > now);
}
