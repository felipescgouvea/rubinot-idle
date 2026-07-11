// Agregador de bônus de combate vindos de Presas (Prey) e Charms. É o ponto
// único que a caçada consulta pra saber "quanto a mais" de dano/XP/gold/loot
// aplicar num kill — assim huntUseCases não precisa conhecer as regras de prey
// nem de charm, só pedir os multiplicadores prontos.
import { G } from './gameStore.js?v=49';
import { isPreyActive, PREY_BONUS_TYPES } from '../domain/prey.js?v=49';
import { CHARMS } from '../domain/charms.js?v=49';

// Soma o valor de todos os charms equipados que tenham um dado efeito.
function charmSum(effect) {
  return (G.charmsEquipped || []).reduce((sum, id) => {
    const c = CHARMS[id];
    return c && c.effect === effect ? sum + c.value : sum;
  }, 0);
}

// Bônus da(s) presa(s) ativa(s) contra ESTE monstro, por tipo de aplicação.
function preyBonus(monsterId, applyKind, now) {
  return (G.prey || []).reduce((sum, slot) => {
    if (!isPreyActive(slot, now)) return sum;
    if (slot.monster !== monsterId) return sum;
    const type = PREY_BONUS_TYPES[slot.bonusType];
    return type && type.apply === applyKind ? sum + slot.bonusPct : sum;
  }, 0);
}

// Retorna os modificadores agregados pra um kill do monstro dado.
//  - damage/xp/gold: MULTIPLICADORES (1 + soma dos bônus).
//  - loot: chance ADITIVA (somada à chance base de cada drop, igual boosts.loot).
//  - lifeleech: fração do dano causado curada de volta (só charm).
export function getCombatBonuses(monsterId, now) {
  return {
    damage: 1 + charmSum('damage') + preyBonus(monsterId, 'damage', now),
    xp: 1 + charmSum('xp') + preyBonus(monsterId, 'xp', now),
    gold: 1 + charmSum('gold'),
    loot: charmSum('loot') + preyBonus(monsterId, 'loot', now),
    lifeleech: charmSum('lifeleech'),
  };
}
