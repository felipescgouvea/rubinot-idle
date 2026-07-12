// Fórmulas de combate: dano, atributos derivados (ATK/DEF/HP/MP/velocidade) e
// escala de monstro por nível. Tudo aqui recebe o estado relevante como
// parâmetro explícito — nada lê um estado global, então é 100% testável
// isoladamente (dado uma entrada, sempre a mesma saída, exceto pelo uso
// deliberado de aleatoriedade do jogo em si: dano varia, monstro é sorteado).

import { VOCATIONS, VOC_TRAINING } from './character.js?v=104';
import { resolveEquippedItem } from './items.js?v=104';
import { pickWeightedMonster } from './adminConfig.js?v=104';

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

// Ação de ataque do monstro contra o jogador neste golpe. Se o monstro tem
// magias (spells do TFS — elemento + dano), tem chance de castar uma (dano
// ELEMENTAL, que ignora a armadura física, como no Tibia); senão dá o golpe
// melee físico (reduzido pela DEF). Casters ficam perigosos mesmo com melee
// fraco. Retorna { dmg, element, kind: 'melee' | 'spell' }.
export function monsterAttack(monster, playerDef) {
  const spells = monster.spells;
  if (spells && spells.length && Math.random() < 0.5) {
    const s = spells[Math.floor(Math.random() * spells.length)];
    const min = Number.isFinite(+s.min) ? +s.min : s.max;
    const raw = min + Math.random() * Math.max(0, s.max - min);
    const dmg = Math.max(1, Math.floor(raw * (monster.spellMult || 1)));
    return { dmg, element: s.element || 'physical', kind: 'spell' };
  }
  return { dmg: calcDamage(monster.atk, playerDef), element: 'physical', kind: 'melee' };
}

// FÓRMULA REAL DO TIBIA (TFS) pra dano/cura de magias e runas. O valor é um
// número aleatório uniforme entre min e max, onde:
//   min = nível/5 + aMin·X + baseMin ;  max = nível/5 + aMax·X + baseMax
// e X é a variável de escala: Magic Level (padrão), skill·ataque (magias físicas
// de melee: Berserk/Groundshaker/Fierce Berserk) ou skill de distância (Ethereal
// Spear). Os 4 coeficientes [aMin, baseMin, aMax, baseMax] são o "base power" de
// cada magia/runa (ver domain/spells.js e domain/items.js) — extraídos dos
// scripts oficiais do TFS (otland/forgottenserver: data/scripts/spells).
export function levelMagicRoll(level, x, power) {
  const [aMin, bMin, aMax, bMax] = power;
  const base = level / 5;
  const min = base + x * aMin + bMin;
  const max = base + x * aMax + bMax;
  return Math.max(1, Math.floor(min + Math.random() * Math.max(0, max - min)));
}

// Dano de UMA magia de ataque num alvo, pela fórmula do Tibia acima. A escala
// depende da magia: física de melee usa skill·ataque; física de distância usa a
// skill de distância; as demais (elementais/holy) usam o Magic Level. A
// resistência/fraqueza elemental do alvo é aplicada por fora (ver huntUseCases).
export function spellAttackDamage({ spell, level, magicLevel, meleeSkill = 0, weaponAtk = 0, distanceSkill = 0 }) {
  if (spell.scale === 'melee') return levelMagicRoll(level, meleeSkill * weaponAtk, spell.power);
  if (spell.scale === 'distance') return levelMagicRoll(level, distanceSkill, spell.power);
  return levelMagicRoll(level, magicLevel, spell.power);
}

// Cura de uma magia — mesma fórmula do Tibia, escalando com nível + Magic Level.
export function spellHealAmount({ spell, level, magicLevel }) {
  return levelMagicRoll(level, magicLevel, spell.power);
}

// Restauração de poção com FAIXA (±15%) em vez de valor fixo — como no Tibia,
// onde a mesma poção cura/restaura um valor variável. `amount` é o item.heal
// ou item.mana de referência.
export function potionRestore(amount) {
  return Math.max(1, Math.floor((amount || 0) * (0.85 + Math.random() * 0.3)));
}

// Dano de runa pela MESMA fórmula do Tibia (nível/5 + ML·a + base), usando o
// base power real da runa (ver domain/items.js: rune.power).
export function runeDamage({ rune, level, magicLevel }) {
  return levelMagicRoll(level, magicLevel, rune.power);
}

// Sorteia uma criatura da zona e escala seus atributos pelo nível do jogador —
// zonas continuam relevantes por mais tempo em vez de ficarem obsoletas rápido.
// `bossMultiplier` (default 1, sem efeito na caçada normal) é só pro Boss
// Rush — ver domain/bestiary.js: bossTierMultiplier — deixa o boss desafiado
// de propósito mais forte que o mesmo bicho encontrado à toa numa zona comum.
export function spawnMonsterInstance(zone, monsterCatalog, playerLevel, bossMultiplier = 1, weights = null) {
  // `weights` (opcional, do Painel Admin) sorteia o monstro pela % configurada;
  // sem ele, sorteio uniforme entre os monstros da zona.
  const monsterId = weights ? pickWeightedMonster(zone.monsters, weights)
    : zone.monsters[Math.floor(Math.random() * zone.monsters.length)];
  const def = monsterCatalog[monsterId];
  // SEM escala por nível do jogador: HP/atk/xp/gold são os valores REAIS do Tibia
  // (ver domain/bestiary.js). O único multiplicador é o de tier do Boss Rush
  // (bossMultiplier = 1 na caçada comum), que deixa o boss desafiado mais forte.
  const mult = bossMultiplier;
  return {
    id: monsterId,
    defKey: monsterId,
    name: def.name,
    icon: def.icon,
    hp: Math.floor(def.hp * mult),
    maxHp: Math.floor(def.hp * mult),
    atk: Math.floor(def.atk * mult),
    def: Math.floor(def.def * bossMultiplier),
    xp: Math.floor(def.xp * mult),
    gold: def.gold.map(g => Math.floor(g * mult)),
    loot: def.loot,
    // Magias/ataques à distância do monstro (elemento + dano), do TFS — o
    // monstro pode castá-las contra o jogador (ver application/huntUseCases.js).
    spells: def.spells || null,
    spellMult: mult, // pra escalar o dano das magias no Boss Rush
  };
}
