// Fórmulas de combate: dano, atributos derivados (ATK/DEF/HP/MP/velocidade) e
// escala de monstro por nível. Tudo aqui recebe o estado relevante como
// parâmetro explícito — nada lê um estado global, então é 100% testável
// isoladamente (dado uma entrada, sempre a mesma saída, exceto pelo uso
// deliberado de aleatoriedade do jogo em si: dano varia, monstro é sorteado).

import { VOCATIONS, VOC_TRAINING } from './character.js?v=208';
import { resolveEquippedItem } from './items.js?v=192';
import { pickWeightedMonster } from './adminConfig.js?v=180';

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
//  • Mage (sorcerer/druid): o DANO FIXO da própria wand/rod (wandDmg), igual
//    ao Tibia real — magic level NÃO escala o autoataque de wand, só as magias.
// O "atk" de outros equipamentos NÃO entra aqui de propósito (no Tibia
// elmo/armadura/anel não aumentam o ataque) — só a arma/munição/wand conta.
// ATK exibido = dano MÁXIMO de arma do jogador, pela fórmula real do TFS
// (getMaxWeaponDamage / rollPlayerAttack). É só o número do painel; o dano real
// do combate é rolado com normal_random(0, este valor) no servidor.
export function computeAtk({ vocation, level, skills, equipment, relics }) {
  if (!vocation) return 0;
  const voc = VOC_TRAINING[vocation];
  const weapon = resolveEquippedItem(equipment.weapon, relics);

  if (voc.attackSkill === 'magic') {
    // Wand/rod tem dano fixo — exibe o TETO da faixa (≈ wandDmg +40%, ver rollPlayerAttack).
    const wd = (weapon && weapon.weaponType === 'magic' && weapon.wandDmg) || 0;
    return wd ? Math.round(wd * 1.4) : 0;
  }

  if (voc.attackSkill === 'distance') {
    const ammo = resolveEquippedItem(equipment.ammo, relics);
    const ammoAtk = (ammo && ammo.type === 'ammo' && ammo.atk) || 0;
    const bowAtk = (weapon && weapon.weaponType === 'distance') ? ((weapon.atk || 0) + (weapon.distanceBonus || 0)) : 0;
    const skill = (skills.distance && skills.distance.lv) || 0;
    return getMaxWeaponDamage(level, skill, ammoAtk + bowAtk, 1);
  }

  // Melee (knight): a arma REALMENTE equipada decide a skill e o ataque; sem
  // arma de corpo-a-corpo, é Fist com ataque base 7.
  const skillId = equippedWeaponSkillId(equipment, relics);
  const isMelee = weapon && (weapon.weaponType === 'sword' || weapon.weaponType === 'axe' || weapon.weaponType === 'club');
  const attackValue = isMelee ? (weapon.atk || 0) : 7;
  const skill = (skills[skillId] && skills[skillId].lv) || 0;
  return getMaxWeaponDamage(level, skill, attackValue, 1);
}

// DEF exibido = armadura (peças de corpo, Player::getArmor) + defesa de escudo
// (Player::getDefense) — as duas fontes que reduzem dano físico no combate real
// (ver reducePhysical). Fiel ao TFS, substitui o antigo shielding*1.2 + soma de def.
export function computeDef({ skills, equipment, relics }) {
  return computePlayerArmor(equipment, relics) + computePlayerDefense({ skills, equipment, relics });
}

export function computeMagic({ skills }) {
  return skills.magic.lv;
}

export function computeSpd({ vocation, equipment, relics }) {
  if (!vocation) return 1;
  const v = VOCATIONS[vocation];
  return +(v.baseSpd + (computeEquipBonus(equipment, relics).spd || 0)).toFixed(2);
}

// ===========================================================================
// FÓRMULAS FIÉIS AO THE FORGOTTEN SERVER (otland/forgottenserver) — extraídas
// verbatim do source (src/weapons.cpp, src/creature.cpp, src/tools.cpp). É o
// caminho de dano REAL do combate (servidor-autoritativo, ver
// server/src/huntEngine.js). Substituem o antigo calcDamage/monsterAttack
// caseiros (mantidos abaixo só pro preview cosmético do cliente).
// ===========================================================================

// uniform_random (src/tools.cpp): inteiro uniforme em [min,max].
export function uniformRandom(minNumber, maxNumber) {
  const a = Math.min(minNumber, maxNumber);
  const b = Math.max(minNumber, maxNumber);
  return a + Math.floor(Math.random() * (b - a + 1));
}

// normal_random (src/tools.cpp): normal_distribution<float>(0.5, 0.25)
// reamostrada até cair em [0,1], mapeada linearmente pra [min,max]. O efeito é
// que o dano tende ao MEIO da faixa (o dano "médio" é o mais comum, os extremos
// raros) — diferente do uniforme chapado do antigo calcDamage. Gauss padrão via
// Box–Muller (com cache do 2º valor).
let _gaussSpare = null;
function _standardNormal() {
  if (_gaussSpare !== null) { const s = _gaussSpare; _gaussSpare = null; return s; }
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const mag = Math.sqrt(-2 * Math.log(u));
  _gaussSpare = mag * Math.sin(2 * Math.PI * v);
  return mag * Math.cos(2 * Math.PI * v);
}
export function normalRandom(minNumber, maxNumber) {
  let x;
  do { x = 0.5 + 0.25 * _standardNormal(); } while (x < 0 || x > 1);
  const a = Math.min(minNumber, maxNumber);
  const b = Math.max(minNumber, maxNumber);
  return a + Math.round(x * (b - a));
}

// Weapons::getMaxWeaponDamage (src/weapons.cpp) — dano MÁXIMO de arma do jogador:
//   round( level/5 + (((skill/4 + 1) * (atk/3)) * 1.03) / attackFactor )
// level/5 é divisão INTEIRA no C++. attackFactor: modo ofensivo = 1.0 (o único
// do jogo — não há modo balanceado/defensivo). O dano real é normal_random(0, max).
export function getMaxWeaponDamage(level, attackSkill, attackValue, attackFactor = 1) {
  return Math.round(Math.floor(level / 5) + ((((attackSkill / 4) + 1) * (attackValue / 3)) * 1.03) / attackFactor);
}

// Weapons::getMaxMeleeDamage (src/weapons.cpp) — dano MÁXIMO de melee de MONSTRO:
//   ceil( skill*(atk*0.05) + atk*0.5 ). Usada quando o monstro define melee por
// skill+attack (aqui tratamos monster.atk direto como o max, ver rollMonsterAttack).
export function getMaxMeleeDamage(attackSkill, attackValue) {
  return Math.ceil((attackSkill * (attackValue * 0.05)) + (attackValue * 0.5));
}

// Creature::blockHit (src/creature.cpp) — redução de dano FÍSICO no ALVO:
//   defesa (bloqueio de escudo): dano -= uniform_random(def/2, def)
//   armadura > 3:                dano -= uniform_random(arm/2, arm-(arm%2+1))
//   armadura 1..3:               dano -= 1
// Só FÍSICO passa por aqui; elemental (fogo/energia/gelo/terra/morte/sagrado)
// ignora armadura (só resistência reduz, aplicada por fora).
export function reducePhysical(damage, armor, defense) {
  let d = damage;
  if (defense > 0) {
    d -= uniformRandom(Math.floor(defense / 2), defense);
    if (d <= 0) return 0;
  }
  if (armor > 3) {
    d -= uniformRandom(Math.floor(armor / 2), armor - (armor % 2 + 1));
  } else if (armor > 0) {
    d -= 1;
  }
  return Math.max(0, d);
}

// Player::getArmor (src/player.cpp) — soma o `def` das peças de CORPO
// (elmo/armadura/pernas/botas/anel). NÃO inclui o escudo (isso é defesa, ver
// computePlayerDefense) nem a arma.
const ARMOR_SLOTS = ['helmet', 'armor', 'legs', 'boots', 'ring'];
export function computePlayerArmor(equipment, relics) {
  let armor = 0;
  ARMOR_SLOTS.forEach(slot => {
    const item = resolveEquippedItem(equipment[slot], relics);
    if (item && item.def) armor += item.def;
  });
  return armor;
}

// ---- Resistência elemental do jogador (Tibia/TFS: Item::getAbsorbPercent) ----
// No TFS, dano elemental (fogo/energia/gelo/terra/morte/sagrado) NÃO reduz por
// armadura/defesa — só pela RESISTÊNCIA do alvo, uma % de absorção por elemento
// que vem das peças de equipamento (`absorbPercent[COMBAT_*]`). Sem isso, no
// endgame o dano elemental dos monstros passava 100% direto e magos/paladinos
// (sem escudo/armadura pesada) morriam sem chance. Aqui somamos o `absorb` de
// cada peça equipada e reduzimos o dano daquele elemento por essa %.
export const ELEMENTAL_RESIST_CAP = 80; // teto por elemento — nunca imunidade total (fiel: Tibia não deixa chegar a 100%)
export const ELEMENTS = ['fire', 'energy', 'ice', 'earth', 'death', 'holy'];
export function computePlayerAbsorb(equipment, relics) {
  const totals = {};
  Object.values(equipment).forEach(slotValue => {
    const item = resolveEquippedItem(slotValue, relics);
    if (!item || !item.absorb) return;
    Object.entries(item.absorb).forEach(([el, pct]) => {
      if (pct) totals[el] = (totals[el] || 0) + pct;
    });
  });
  Object.keys(totals).forEach(el => { totals[el] = Math.min(ELEMENTAL_RESIST_CAP, totals[el]); });
  return totals;
}

// Reduz um dano de `element` pela resistência (%) do jogador. Físico não passa
// aqui (reduz por armadura/defesa em reducePhysical). `absorb` é o mapa vindo de
// computePlayerAbsorb. Também suporta VULNERABILIDADE (absorb negativo = leva
// mais dano), fiel ao Tibia (ex.: fogo em quem é fraco a fogo).
export function reduceElemental(damage, element, absorb) {
  if (!absorb || !element || element === 'physical') return damage;
  const pct = absorb[element] || 0;
  if (!pct) return damage;
  return Math.max(0, damage * (1 - pct / 100));
}

// Estilo de luta (Fight Mode do Tibia/TFS). attackFactor DIVIDE o dano do
// jogador (fator maior = menos dano); defenseFactor MULTIPLICA a defesa de
// escudo (maior = mais bloqueio). Valores REAIS do TFS (Player::getAttackFactor
// / getDefenseFactor). Só afeta dano FÍSICO e o auto-ataque de arma + o bloqueio
// de escudo — magia e dano elemental NÃO mudam com o modo (fiel ao TFS).
// fightMode omitido/desconhecido = 1.0/1.0 (comportamento antigo preservado).
export const FIGHT_MODES = {
  attack:   { attackFactor: 1.0, defenseFactor: 0.5 },  // Ofensivo: dano máx, defesa reduzida
  balanced: { attackFactor: 1.2, defenseFactor: 0.75 }, // Equilibrado
  defense:  { attackFactor: 2.0, defenseFactor: 1.0 },  // Defensivo: metade do dano, defesa cheia
};
function attackFactorOf(mode) { return (FIGHT_MODES[mode] && FIGHT_MODES[mode].attackFactor) || 1.0; }
function defenseFactorOf(mode) { return (FIGHT_MODES[mode] && FIGHT_MODES[mode].defenseFactor) || 1.0; }

// Player::getDefense (src/player.cpp), só a parte de ESCUDO (nossas armas não
// têm defense): (shielding/4 + 2.23) * defEscudo * 0.15 * defenseFactor. Sem
// escudo equipado não há bloqueio de defesa (fist defense é desprezível).
export function computePlayerDefense({ skills, equipment, relics, fightMode }) {
  const shield = resolveEquippedItem(equipment.shield, relics);
  if (!shield || !shield.def) return 0;
  const shielding = (skills.shielding && skills.shielding.lv) || 0;
  return Math.floor((shielding / 4 + 2.23) * shield.def * 0.15 * defenseFactorOf(fightMode));
}

// Golpe básico do jogador ANTES da redução do alvo, fiel ao TFS (WeaponMelee/
// WeaponDistance/WeaponWand::getWeaponDamage). Retorna { damage, element,
// physical }: `physical` diz se o alvo reduz por armadura (melee/distância) ou
// não (wand elemental).
export function rollPlayerAttack({ vocation, level, skills, equipment, relics, fightMode }) {
  if (!vocation) return { damage: 0, element: 'physical', physical: true };
  const voc = VOC_TRAINING[vocation];
  const weapon = resolveEquippedItem(equipment.weapon, relics);
  const af = attackFactorOf(fightMode); // estilo de luta (Ofensivo/Equilibrado/Defensivo)

  if (voc.attackSkill === 'magic') {
    // Wand/rod: dano FIXO em faixa (normal_random(minChange,maxChange)), sem
    // escala por Magic Level — igual ao Tibia. wandDmg guardado é a MÉDIA;
    // faixa ≈ ±40% (ex.: 13 -> 8..18, como a Wand of Vortex real). Elemental:
    // não reduz por armadura.
    const wd = (weapon && weapon.weaponType === 'magic' && weapon.wandDmg) || 0;
    if (!wd) return { damage: 0, element: 'physical', physical: false };
    const spread = Math.round(wd * 0.4);
    return { damage: normalRandom(wd - spread, wd + spread), element: 'physical', physical: false };
  }

  if (voc.attackSkill === 'distance') {
    // WeaponDistance: attackValue = ataque da MUNIÇÃO + ataque do arco (o arco
    // SOMA no ataque, não na skill). distanceBonus histórico do jogo é tratado
    // como ataque extra do arco. min vs monstro = ceil(level*0.2).
    const ammo = resolveEquippedItem(equipment.ammo, relics);
    const ammoAtk = (ammo && ammo.type === 'ammo' && ammo.atk) || 0;
    const bowAtk = (weapon && weapon.weaponType === 'distance') ? ((weapon.atk || 0) + (weapon.distanceBonus || 0)) : 0;
    const attackValue = ammoAtk + bowAtk;
    const skill = (skills.distance && skills.distance.lv) || 0;
    const max = getMaxWeaponDamage(level, skill, attackValue, af);
    const min = Math.ceil(level * 0.2);
    return { damage: normalRandom(min, max), element: 'physical', physical: true };
  }

  // Melee (knight): a arma REALMENTE equipada decide skill+ataque; sem arma de
  // corpo-a-corpo, Fist com ataque base 7.
  const skillId = equippedWeaponSkillId(equipment, relics);
  const isMelee = weapon && (weapon.weaponType === 'sword' || weapon.weaponType === 'axe' || weapon.weaponType === 'club');
  const attackValue = isMelee ? (weapon.atk || 0) : 7;
  const skill = (skills[skillId] && skills[skillId].lv) || 0;
  const max = getMaxWeaponDamage(level, skill, attackValue, 1);
  return { damage: normalRandom(0, max), element: 'physical', physical: true };
}

// Ataque do MONSTRO contra o jogador ANTES da redução, fiel ao TFS. `monster.atk`
// do bestiário é tratado como o dano MÁXIMO de melee (equivale a um monstro TFS
// com melee `min=0 max=-atk`) — melee = normal_random(0, atk), físico. Se tem
// magias, 50% de chance de castar uma (mantém a cadência de UM ataque por tick,
// só corrige a matemática): normal_random(min,max) do elemento. `physical` diz se
// o jogador reduz por armadura+defesa (físico) ou não (elemental).
export function rollMonsterAttack(monster) {
  const spells = monster.spells;
  if (spells && spells.length && Math.random() < 0.5) {
    const s = spells[Math.floor(Math.random() * spells.length)];
    const min = Number.isFinite(+s.min) ? +s.min : +s.max;
    // spells: min/max NÃO vêm pré-escalados (só o atk de melee vem), então o
    // spellMult do Boss Rush é aplicado aqui.
    const raw = normalRandom(min, +s.max) * (monster.spellMult || 1);
    const element = s.element || 'physical';
    return { damage: Math.max(0, Math.floor(raw)), element, kind: 'spell', physical: element === 'physical' };
  }
  // melee: monster.atk JÁ vem escalado por spawnMonsterInstance — não re-escalar.
  return { damage: normalRandom(0, Math.max(0, monster.atk || 0)), element: 'physical', kind: 'melee', physical: true };
}

// Cadência FIEL ao TFS: melee e magia do monstro disparam INDEPENDENTES (cada um
// no seu intervalo), não "um ou outro". Estas duas funções separam os dois golpes
// pro tick do servidor agendar cada um por conta própria (ver huntEngine.js).

// Só o MELEE físico do monstro (dano cru; a redução por armadura/defesa é feita
// por fora). monster.atk é o dano MÁXIMO — normal_random(0, atk).
export function rollMonsterMelee(monster) {
  return normalRandom(0, Math.max(0, monster.atk || 0));
}

// Uma magia do monstro (elemento + dano), ou null se não tiver spells.
// normal_random(min, max) com o spellMult (Boss Rush) aplicado. `physical` diz
// se o alvo reduz por armadura (só físico) — elemental passa direto.
export function rollMonsterSpell(monster) {
  const spells = monster.spells;
  if (!spells || !spells.length) return null;
  const s = spells[Math.floor(Math.random() * spells.length)];
  const min = Number.isFinite(+s.min) ? +s.min : +s.max;
  const raw = normalRandom(min, +s.max) * (monster.spellMult || 1);
  const element = s.element || 'physical';
  return { damage: Math.max(0, Math.floor(raw)), element, physical: element === 'physical' };
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
  // TFS rola o valor entre min e max com normal_random (o engine trunca pra int:
  // normal_random((int)mina, (int)maxa)), não uniforme — dano tende ao meio da
  // faixa. Mesma média de antes; só a distribuição fica fiel.
  return Math.max(1, normalRandom(Math.floor(min), Math.floor(max)));
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
