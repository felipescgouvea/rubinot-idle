// Atributos derivados do personagem atual — fininhas amarrações entre o
// estado vivo (G) e as fórmulas puras do domínio. Sem efeito colateral:
// seguro pra application E ui chamarem à vontade pra exibir/computar.
import { G } from './gameStore.js?v=25';
import {
  computeMaxHp, computeMaxMana, computeAtk, computeDef, computeMagic, computeSpd,
  computeEquipBonus, equippedWeaponSkillId,
} from '../domain/combatFormulas.js?v=25';

export function getMaxHp() {
  return computeMaxHp({ vocation: G.vocation, level: G.level, equipment: G.equipment });
}

export function getMaxMana() {
  return computeMaxMana({ vocation: G.vocation, level: G.level });
}

export function getAtk() {
  return computeAtk({ vocation: G.vocation, level: G.level, skills: G.sk, equipment: G.equipment });
}

export function getDef() {
  return computeDef({ skills: G.sk, equipment: G.equipment });
}

export function getMagic() {
  return computeMagic({ skills: G.sk });
}

export function getSpd() {
  return computeSpd({ vocation: G.vocation, equipment: G.equipment });
}

export function getEquipBonus() {
  return computeEquipBonus(G.equipment);
}

export function getEquippedWeaponSkillId() {
  return equippedWeaponSkillId(G.equipment);
}
