// Fórmulas de combate: dano, atributos derivados (ATK/DEF/HP/MP/velocidade) e
// escala de monstro por nível. Tudo aqui recebe o estado relevante como
// parâmetro explícito — nada lê um estado global, então é 100% testável
// isoladamente (dado uma entrada, sempre a mesma saída, exceto pelo uso
// deliberado de aleatoriedade do jogo em si: dano varia, monstro é sorteado).

import { VOCATIONS, VOC_TRAINING } from './character.js?v=50';
import { resolveEquippedItem } from './items.js?v=50';

// Qual skill de combate corpo-a-corpo/distância é treinada e usada no dano,
// segundo a ARMA REALMENTE EQUIPADA — não a vocação. Sem arma (ou com uma arma
// mágica, tipo rod/wand), o golpe é desarmado e treina Fist Fighting, como no Tibia.
// `relics` é opcional (G.relics) — precisa pra resolver a arma quando o slot
// guarda o id de uma Relíquia em vez de um itemId comum (ver domain/items.js).
export function equippedWeaponSkillId(equipment, relics) {
  const weapon = resolveEquippedItem(equipment.weapon, relics);
  const wt = weapon && weapon.weaponType;
  if (wt === 'sword' || wt === 'axe' || wt === 'club' || wt === 'distance') return wt;
  return 'fist';
}

export function computeEquipBonus(equipment, relics) {
  const totals = {};
  Object.values(equipment).forEach(slotValue => {
    const item = resolveEquippedItem(slotValue, relics);
    if (!item) return;
    ['atk', 'def', 'magic', 'hp', 'spd'].forEach(stat => {
      if (item[stat]) totals[stat] = (totals[stat] || 0) + item[stat];
    });
  });
  return totals;
}

export function computeMaxHp({ vocation, level, equipment, relics }) {
  if (!vocation) return 100;
  const v = VOCATIONS[vocation];
  const base = v.baseHp + (level - 1) * v.hpPerLevel;
  const eqBonus = computeEquipBonus(equipment, relics).hp || 0;
  return base + eqBonus;
}

export function computeMaxMana({ vocation, level }) {
  if (!vocation) return 100;
  const v = VOCATIONS[vocation];
  return v.baseMana + (level - 1) * v.manaPerLevel;
}

// Poder de ataque por vocação, no estilo Tibia — cada uma combina a SKILL
// treinada com uma fonte de dano diferente do equipamento:
//  • Knight (melee): ataque da ARMA (sword/axe/club) + a skill correspondente.
//    Sem arma de corpo-a-corpo, soca (Fist, ataque base 7).
//  • Paladin (distance): ataque da MUNIÇÃO (flecha/dardo) + Distance skill. O
//    arco/besta NÃO soma ataque — só pode dar bônus de skill (distanceBonus).
//  • Mage (sorcerer/druid): Magic Level + o DANO BASE da própria wand/rod
//    (wandDmg). A wand não soma "atk"; ela tem dano próprio.
// O "atk" de outros equipamentos NÃO entra aqui de propósito (no Tibia
// elmo/armadura/anel não aumentam o ataque) — só a arma/munição/wand conta.
export function computeAtk({ vocation, level, skills, equipment, relics }) {
  if (!vocation) return 0;
  const voc = VOC_TRAINING[vocation];
  const weapon = resolveEquippedItem(equipment.weapon, relics);

  if (voc.attackSkill === 'magic') {
    const wandDmg = (weapon && weapon.weaponType === 'magic' && weapon.wandDmg) || 0;
    const ml = skills.magic.lv;
    return Math.floor(ml * 2.5 + wandDmg * (1 + ml * 0.03) + level / 4);
  }

  if (voc.attackSkill === 'distance') {
    const ammo = resolveEquippedItem(equipment.ammo, relics);
    const ammoAtk = (ammo && ammo.type === 'ammo' && ammo.atk) || 0;
    const bowBonus = (weapon && weapon.weaponType === 'distance' && weapon.distanceBonus) || 0;
    const dist = skills.distance.lv + bowBonus;
    return Math.floor(0.09 * ammoAtk * (dist + 5) + level / 4);
  }

  // Melee (knight): a arma REALMENTE equipada decide a skill e o ataque; sem
  // arma de corpo-a-corpo, é Fist com ataque base 7.
  const skillId = equippedWeaponSkillId(equipment, relics);
  const isMelee = weapon && (weapon.weaponType === 'sword' || weapon.weaponType === 'axe' || weapon.weaponType === 'club');
  const weaponAtk = isMelee ? (weapon.atk || 0) : 7;
  return Math.floor(0.09 * weaponAtk * (skills[skillId].lv + 5) + level / 4);
}

// Defesa: o bônus de Shielding só se aplica com um escudo equipado — sem escudo,
// a skill não tem onde "encostar" (como no Tibia, ela melhora a defesa do escudo).
export function computeDef({ skills, equipment, relics }) {
  const eq = computeEquipBonus(equipment, relics).def || 0;
  const shieldBonus = equipment.shield ? Math.floor(skills.shielding.lv * 1.2) : 0;
  return shieldBonus + eq;
}

export function computeMagic({ skills }) {
  return skills.magic.lv;
}

export function computeSpd({ vocation, equipment, relics }) {
  if (!vocation) return 1;
  const v = VOCATIONS[vocation];
  return +(v.baseSpd + (computeEquipBonus(equipment, relics).spd || 0)).toFixed(2);
}

export function calcDamage(atk, def) {
  const base = Math.max(1, atk - Math.floor(def * 0.6));
  return Math.max(1, Math.floor(base * (0.8 + Math.random() * 0.4)));
}

// Sorteia uma criatura da zona e escala seus atributos pelo nível do jogador —
// zonas continuam relevantes por mais tempo em vez de ficarem obsoletas rápido.
// `bossMultiplier` (default 1, sem efeito na caçada normal) é só pro Boss
// Rush — ver domain/bestiary.js: bossTierMultiplier — deixa o boss desafiado
// de propósito mais forte que o mesmo bicho encontrado à toa numa zona comum.
export function spawnMonsterInstance(zone, monsterCatalog, playerLevel, bossMultiplier = 1) {
  const monsterId = zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
  const def = monsterCatalog[monsterId];
  const scaleFactor = (1 + (playerLevel - 1) * 0.05) * bossMultiplier;
  return {
    id: monsterId,
    defKey: monsterId,
    name: def.name,
    icon: def.icon,
    hp: Math.floor(def.hp * scaleFactor),
    maxHp: Math.floor(def.hp * scaleFactor),
    atk: Math.floor(def.atk * scaleFactor),
    def: Math.floor(def.def * bossMultiplier),
    xp: Math.floor(def.xp * scaleFactor),
    gold: def.gold.map(g => Math.floor(g * scaleFactor)),
    loot: def.loot,
  };
}
