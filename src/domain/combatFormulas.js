// Fórmulas de combate: dano, atributos derivados (ATK/DEF/HP/MP/velocidade) e
// escala de monstro por nível. Tudo aqui recebe o estado relevante como
// parâmetro explícito — nada lê um estado global, então é 100% testável
// isoladamente (dado uma entrada, sempre a mesma saída, exceto pelo uso
// deliberado de aleatoriedade do jogo em si: dano varia, monstro é sorteado).

import { VOCATIONS, VOC_TRAINING } from './character.js?v=24';
import { ITEMS } from './items.js?v=24';

// Qual skill de combate corpo-a-corpo/distância é treinada e usada no dano,
// segundo a ARMA REALMENTE EQUIPADA — não a vocação. Sem arma (ou com uma arma
// mágica, tipo rod/wand), o golpe é desarmado e treina Fist Fighting, como no Tibia.
export function equippedWeaponSkillId(equipment) {
  const weapon = equipment.weapon ? ITEMS[equipment.weapon] : null;
  const wt = weapon && weapon.weaponType;
  if (wt === 'sword' || wt === 'axe' || wt === 'club' || wt === 'distance') return wt;
  return 'fist';
}

export function computeEquipBonus(equipment) {
  const totals = {};
  Object.values(equipment).forEach(itemId => {
    if (!itemId) return;
    const item = ITEMS[itemId];
    if (!item) return;
    ['atk', 'def', 'magic', 'hp', 'spd'].forEach(stat => {
      if (item[stat]) totals[stat] = (totals[stat] || 0) + item[stat];
    });
  });
  return totals;
}

export function computeMaxHp({ vocation, level, equipment }) {
  if (!vocation) return 100;
  const v = VOCATIONS[vocation];
  const base = v.baseHp + (level - 1) * v.hpPerLevel;
  const eqBonus = computeEquipBonus(equipment).hp || 0;
  return base + eqBonus;
}

export function computeMaxMana({ vocation, level }) {
  if (!vocation) return 100;
  const v = VOCATIONS[vocation];
  return v.baseMana + (level - 1) * v.manaPerLevel;
}

// Dano segue a skill realmente treinada, como no Tibia:
// mages = Magic Level; demais vocações = skill da arma equipada (ou Fist, desarmado).
export function computeAtk({ vocation, level, skills, equipment }) {
  if (!vocation) return 0;
  const eq = computeEquipBonus(equipment).atk || 0;
  const eqMagic = computeEquipBonus(equipment).magic || 0;
  const voc = VOC_TRAINING[vocation];
  if (voc.attackSkill === 'magic') {
    return Math.floor(skills.magic.lv * 3 + level * 0.8 + eq + eqMagic * 1.5);
  }
  const skillId = equippedWeaponSkillId(equipment);
  if (skillId === 'distance') {
    return Math.floor(skills.distance.lv * 2.2 + level + eq);
  }
  return Math.floor(skills[skillId].lv * 2 + level * 1.5 + eq);
}

// Defesa: o bônus de Shielding só se aplica com um escudo equipado — sem escudo,
// a skill não tem onde "encostar" (como no Tibia, ela melhora a defesa do escudo).
export function computeDef({ skills, equipment }) {
  const eq = computeEquipBonus(equipment).def || 0;
  const shieldBonus = equipment.shield ? Math.floor(skills.shielding.lv * 1.2) : 0;
  return shieldBonus + eq;
}

export function computeMagic({ skills }) {
  return skills.magic.lv;
}

export function computeSpd({ vocation, equipment }) {
  if (!vocation) return 1;
  const v = VOCATIONS[vocation];
  return +(v.baseSpd + (computeEquipBonus(equipment).spd || 0)).toFixed(2);
}

export function calcDamage(atk, def) {
  const base = Math.max(1, atk - Math.floor(def * 0.6));
  return Math.max(1, Math.floor(base * (0.8 + Math.random() * 0.4)));
}

// Sorteia uma criatura da zona e escala seus atributos pelo nível do jogador —
// zonas continuam relevantes por mais tempo em vez de ficarem obsoletas rápido.
export function spawnMonsterInstance(zone, monsterCatalog, playerLevel) {
  const monsterId = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
  const def = monsterCatalog[monsterId];
  const scaleFactor = 1 + (playerLevel - 1) * 0.05;
  return {
    id: monsterId,
    defKey: monsterId,
    name: def.name,
    icon: def.icon,
    hp: Math.floor(def.hp * scaleFactor),
    maxHp: Math.floor(def.hp * scaleFactor),
    atk: Math.floor(def.atk * scaleFactor),
    def: def.def,
    xp: Math.floor(def.xp * scaleFactor),
    gold: def.gold,
    loot: def.loot,
  };
}
