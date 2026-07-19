// Simulação de PROGRESSÃO das 4 vocações — roda o loop de combate REAL (fórmulas
// TFS-fiéis de combatFormulas.js, dados reais do bestiário) headless e mais
// rápido que o tempo real, pra ver o balanço: DPS, dano sofrido, sobrevivência,
// XP/h e sustentabilidade de mana/suprimento por vocação em vários níveis.
// Fiel ao servidor (huntEngine.resolveTick): SEM regen passivo em caçada — cura
// vem de spell/poção; mana cai com spell e sobe só com poção de mana.
// Nota: o cap do jogo é level 100 (XP_TABLE tem 100 entradas); simulo até 100.
// Uso: node scripts/sim-vocations.mjs
const v = '?v=' + Date.now();
const base = 'file:///c:/workspace/rubinot-idle/src/domain/';
const [CF, BE, CH, SP, IT, EL, RT] = await Promise.all([
  import(base + 'combatFormulas.js' + v), import(base + 'bestiary.js' + v), import(base + 'character.js' + v),
  import(base + 'spells.js' + v), import(base + 'items.js' + v), import(base + 'elements.js' + v), import(base + 'rtcConfig.js' + v),
]);
const { rollPlayerAttack, reducePhysical, rollMonsterAttack, computeMaxHp, computeMaxMana, computePlayerArmor, computePlayerDefense, spellAttackDamage, spellHealAmount, equippedWeaponSkillId } = CF;
const { MONSTERS } = BE;
const { VOCATIONS, VOC_TRAINING, XP_TABLE } = CH;
const { SPELLS, isSpellAvailable, defaultHealSpellId } = SP;
const { ITEMS } = IT;
const { elementMod } = EL;

// --- loadout por vocação por nível (equipamento real + skills modeladas) ---
function gearTier(voc, lvl) {
  const t = lvl >= 100 ? 4 : lvl >= 75 ? 3 : lvl >= 50 ? 2 : lvl >= 25 ? 1 : 0;
  const G = {
    knight: [
      { weapon: 'dagger', armor: 'leather_armor', shield: 'wooden_shield', helmet: 'leather_helmet', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'halberd', armor: 'studded_armor', shield: 'wooden_shield', helmet: 'chain_helmet', legs: 'plate_legs', boots: 'leather_boots' },
      { weapon: 'giant_sword', armor: 'chain_armor', shield: 'demon_shield', helmet: 'strange_helmet', legs: 'plate_legs', boots: 'leather_boots' },
      { weapon: 'titan_axe', armor: 'knight_armor', shield: 'demon_shield', helmet: 'royal_helmet', legs: 'dragon_scale_legs', boots: 'boots_of_haste' },
      { weapon: 'morgul_blade', armor: 'magic_plate_armor', shield: 'medusa_shield', helmet: 'royal_helmet', legs: 'dragon_scale_legs', boots: 'boots_of_haste' },
    ],
    paladin: [
      { weapon: 'bow', ammo: 'arrow', armor: 'leather_armor', helmet: 'leather_helmet', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'bow', ammo: 'bolt', armor: 'studded_armor', helmet: 'chain_helmet', legs: 'plate_legs', boots: 'leather_boots' },
      { weapon: 'bow', ammo: 'power_bolt', armor: 'chain_armor', helmet: 'strange_helmet', legs: 'plate_legs', boots: 'leather_boots' },
      { weapon: 'lothlorien_bow', ammo: 'power_bolt', armor: 'knight_armor', helmet: 'royal_helmet', legs: 'dragon_scale_legs', boots: 'boots_of_haste' },
      { weapon: 'lothlorien_bow', ammo: 'power_bolt', armor: 'magic_plate_armor', helmet: 'royal_helmet', legs: 'dragon_scale_legs', boots: 'boots_of_haste' },
    ],
    sorcerer: [
      { weapon: 'wand_of_vortex', armor: 'leather_armor', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'wand_of_vortex', armor: 'studded_armor', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'skull_staff', armor: 'chain_armor', legs: 'plate_legs', boots: 'leather_boots', ring: 'death_ring' },
      { weapon: 'dragonbone_staff', armor: 'magic_plate_armor', legs: 'plate_legs', boots: 'boots_of_haste', ring: 'death_ring' },
      { weapon: 'dragonbone_staff', armor: 'magic_plate_armor', legs: 'dragon_scale_legs', boots: 'boots_of_haste', ring: 'death_ring' },
    ],
    druid: [
      { weapon: 'snakebite_rod', armor: 'leather_armor', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'snakebite_rod', armor: 'studded_armor', legs: 'leather_legs', boots: 'leather_boots' },
      { weapon: 'skull_staff', armor: 'chain_armor', legs: 'plate_legs', boots: 'leather_boots', ring: 'dwarven_ring' },
      { weapon: 'dragonbone_staff', armor: 'magic_plate_armor', legs: 'plate_legs', boots: 'boots_of_haste', ring: 'dwarven_ring' },
      { weapon: 'dragonbone_staff', armor: 'magic_plate_armor', legs: 'dragon_scale_legs', boots: 'boots_of_haste', ring: 'dwarven_ring' },
    ],
  }[voc][t];
  // remove ids que não existem em ITEMS (evita ruído)
  const eq = {}; for (const k of Object.keys(G)) if (!G[k] || ITEMS[G[k]]) eq[k] = G[k] || null;
  return eq;
}
function skillsFor(voc, lvl) {
  const main = Math.min(130, Math.round(10 + lvl * 1.0));
  const ml = Math.min(105, Math.round(lvl * 0.9));
  const shield = Math.min(120, Math.round(10 + lvl * (voc === 'knight' ? 0.95 : 0.5)));
  return {
    sword: { lv: voc === 'knight' ? main : 10 }, axe: { lv: 10 }, club: { lv: 10 }, fist: { lv: 10 },
    distance: { lv: voc === 'paladin' ? main : 10 }, shielding: { lv: shield },
    magic: { lv: (voc === 'sorcerer' || voc === 'druid') ? ml : (voc === 'paladin' ? Math.round(ml * 0.5) : 0) },
  };
}
// melhor magia de ataque disponível (maior max estimado) por vocação/nível
function bestAttackSpell(voc, lvl, ml, meleeSkill, weaponAtk, distSkill) {
  let best = null, bestMax = 0;
  for (const [id, s] of Object.entries(SPELLS)) {
    if (s.type === 'heal' || !s.power || !s.voc || !s.voc.includes(voc)) continue;
    if (!isSpellAvailable(id, voc, lvl)) continue;
    const x = s.scale === 'melee' ? meleeSkill * weaponAtk : s.scale === 'distance' ? distSkill : ml;
    const est = lvl / 5 + x * s.power[2] + s.power[3];
    if (est > bestMax) { bestMax = est; best = { id, s }; }
  }
  return best;
}
// alvo por nível (monstro de hunt apropriado)
const TARGET = { 8: 'troll', 25: 'minotaur', 50: 'dragon', 75: 'hydra', 100: 'demon' };

const HEAL_POTION = lvl => lvl >= 130 ? 'ultimate_health_potion' : lvl >= 80 ? 'great_health_potion' : lvl >= 50 ? 'strong_health_potion' : 'health_potion';
const MANA_POTION = lvl => lvl >= 80 ? 'great_mana_potion' : lvl >= 50 ? 'strong_mana_potion' : 'mana_potion';

function simulate(voc, lvl, minutes, mode = 'attack') {
  const equipment = gearTier(voc, lvl), skills = skillsFor(voc, lvl), relics = [];
  const maxHp = computeMaxHp({ vocation: voc, level: lvl, equipment, relics });
  const maxMana = computeMaxMana({ vocation: voc, level: lvl });
  const armor = computePlayerArmor(equipment, relics), defense = computePlayerDefense({ skills, equipment, relics, fightMode: mode });
  const ml = skills.magic.lv, meleeSkillId = equippedWeaponSkillId(equipment, relics);
  const meleeSkill = (skills[meleeSkillId] || { lv: 10 }).lv;
  const weapon = ITEMS[equipment.weapon] || {}; const weaponAtk = weapon.atk || 7;
  const distSkill = skills.distance.lv;
  const atkSpell = bestAttackSpell(voc, lvl, ml, meleeSkill, weaponAtk, distSkill);
  const healId = defaultHealSpellId(voc, lvl); const healSpell = isSpellAvailable(healId, voc, lvl) ? SPELLS[healId] : null;
  const healPot = ITEMS[HEAL_POTION(lvl)], manaPot = ITEMS[MANA_POTION(lvl)];
  const targetId = TARGET[Object.keys(TARGET).map(Number).reduce((a, b) => Math.abs(b - lvl) < Math.abs(a - lvl) ? b : a)];
  const mdef = MONSTERS[targetId];

  const state = { hp: maxHp, mana: maxMana, kills: 0, xp: 0, gold: 0, deaths: 0, dmgDealt: 0, dmgTaken: 0, supplies: 0, potCd: 0, atkGroupCd: 0, spellCasts: 0 };
  const spawn = () => ({ ...mdef, defKey: targetId, hp: mdef.hp, spellMult: 1 });
  let mon = spawn();
  const ticks = Math.round(minutes * 60 / 2); // 2s/tick
  const v2 = VOC_TRAINING[voc];

  for (let t = 0; t < ticks; t++) {
    const now = t * 2000;
    // (1) golpe básico
    const ar = rollPlayerAttack({ vocation: voc, level: lvl, skills, equipment, relics, fightMode: mode });
    let bd = ar.damage * elementMod(mon.defKey, ar.element);
    if (ar.physical) bd = reducePhysical(bd, mon.def, 0);
    bd = Math.max(1, Math.floor(bd)); mon.hp -= bd; state.dmgDealt += bd;
    // (2) magia de ataque (grupo de ataque 2s)
    if (atkSpell && mon.hp > 0 && state.mana >= atkSpell.s.mana && now >= state.atkGroupCd) {
      const sd0 = spellAttackDamage({ spell: atkSpell.s, level: lvl, magicLevel: ml, meleeSkill, weaponAtk, distanceSkill: distSkill });
      const sd = Math.max(1, Math.floor(sd0 * elementMod(mon.defKey, atkSpell.s.element)));
      mon.hp -= sd; state.dmgDealt += sd; state.mana -= atkSpell.s.mana; state.atkGroupCd = now + 2000; state.spellCasts++;
    }
    // (3) cura: spell se hp<60% e tem mana; senão poção (exhaust 1s)
    const hpPct = state.hp / maxHp * 100;
    if (state.hp > 0 && hpPct < 60 && healSpell && state.mana >= healSpell.mana) {
      state.hp = Math.min(maxHp, state.hp + spellHealAmount({ spell: healSpell, level: lvl, magicLevel: ml })); state.mana -= healSpell.mana;
    } else if (state.hp > 0 && hpPct < 45 && healPot && now >= state.potCd) {
      state.hp = Math.min(maxHp, state.hp + healPot.heal); state.supplies += healPot.sell; state.potCd = now + 1000;
    }
    // (4) mana potion se mana<35% (exhaust compartilhado)
    if (manaPot && (state.mana / maxMana * 100) < 35 && now >= state.potCd) {
      state.mana = Math.min(maxMana, state.mana + manaPot.mana); state.supplies += manaPot.sell; state.potCd = now + 1000;
    }
    // (5) contra-ataque do monstro (sem grace no sim)
    if (mon.hp > 0) {
      const mr = rollMonsterAttack(mon);
      let d = mr.damage; if (mr.physical) d = reducePhysical(d, armor, defense);
      d = Math.floor(d); state.hp -= d; state.dmgTaken += d;
    }
    // morte
    if (state.hp <= 0) { state.deaths++; state.hp = Math.floor(maxHp * 0.5); state.mana = maxMana; }
    // kill
    if (mon.hp <= 0) { state.kills++; state.xp += mdef.xp; state.gold += Math.floor((mdef.gold[0] + mdef.gold[1]) / 2); mon = spawn(); }
  }
  const perH = x => Math.round(x / (minutes / 60));
  return {
    voc, lvl, target: targetId, maxHp, maxMana,
    atkSpell: atkSpell ? atkSpell.id : '(só melee/wand)',
    killsH: perH(state.kills), xpH: perH(state.xp),
    dps: +(state.dmgDealt / (ticks * 2)).toFixed(0), dtps: +(state.dmgTaken / (ticks * 2)).toFixed(0),
    deathsH: +(state.deaths / (minutes / 60)).toFixed(1),
    profitH: perH(state.gold - state.supplies), suppliesH: perH(state.supplies),
    manaEnd: Math.round(state.mana), manaOut: state.mana < maxMana * 0.1 && atkSpell,
  };
}

console.log('=== SIMULAÇÃO DE PROGRESSÃO — 4 VOCAÇÕES (fórmulas TFS-fiéis, 30 min/checkpoint) ===');
console.log('(fiel ao servidor: sem regen passivo em caçada; cura via spell/poção; cap do jogo = level 100)\n');
const LEVELS = [8, 25, 50, 75, 100];
for (const voc of ['knight', 'paladin', 'sorcerer', 'druid']) {
  console.log(`\n### ${VOCATIONS[voc].name.toUpperCase()}`);
  console.log('lvl'.padEnd(4), 'alvo'.padEnd(10), 'hp/mana'.padEnd(12), 'DPS'.padStart(5), 'dano/s'.padStart(7), 'kills/h'.padStart(8), 'XP/h'.padStart(9), 'mortes/h'.padStart(9), 'lucro/h'.padStart(9), '  magia');
  for (const lvl of LEVELS) {
    const r = simulate(voc, lvl, 30);
    console.log(
      String(lvl).padEnd(4), r.target.padEnd(10), `${r.maxHp}/${r.maxMana}`.padEnd(12),
      String(r.dps).padStart(5), String(r.dtps).padStart(7), String(r.killsH).padStart(8), String(r.xpH).padStart(9),
      String(r.deathsH).padStart(9), String(r.profitH).padStart(9), ' ', r.atkSpell + (r.manaOut ? ' ⚠️mana-out' : ''),
    );
  }
}

// --- ESTILO DE LUTA (Fight Mode): tradeoff dano × sobrevivência (Knight, com
// escudo, contra alvo físico onde a defesa pesa) ---
console.log('\n\n=== ESTILO DE LUTA — Knight lvl 25 (minotaur, físico) e lvl 50 (dragon) ===');
console.log('modo'.padEnd(12), 'lvl'.padEnd(4), 'DPS'.padStart(5), 'dano/s sofrido'.padStart(15), 'kills/h'.padStart(8), 'mortes/h'.padStart(9));
for (const lvl of [25, 50]) {
  for (const mode of ['attack', 'balanced', 'defense']) {
    const r = simulate('knight', lvl, 30, mode);
    const label = { attack: '⚔️ Ofensivo', balanced: '⚖️ Equilibrado', defense: '🛡️ Defensivo' }[mode];
    console.log(label.padEnd(12), String(lvl).padEnd(4), String(r.dps).padStart(5), String(r.dtps).padStart(15), String(r.killsH).padStart(8), String(r.deathsH).padStart(9));
  }
}
