// Motor de caçada AUTORITATIVO.
//
// Marco 2: cada kill é decidido por ESTE processo, rodando sozinho, contra o
// relógio real do servidor. Marco 3: loot + relíquias. Marco 4: atk/def/spd
// vêm de player_stats/player_skills/player_equipment, nunca mais de um
// snapshot declarado pelo cliente.
//
// Marco 5: combate de verdade — magia/runa por prioridade (RTC), dano
// elemental, cura automática (spell/poção), contra-ataque do monstro, morte
// e HP/mana persistidos entre ticks, treino de skill real. Simplificações
// deliberadas (documentadas, não escondidas):
//  - Só alvo único: sem respingo de área (ataques de área causam dano só no
//    alvo da frente aqui, mesmo que no cliente atinjam vários). Zonas com
//    salas cheias rendem menos no servidor que pareceria no combate visual.
//  - Bênçãos: tratadas como 0 (ninguém perde menos XP na morte por ter
//    comprado bênção) — a contagem de bênçãos ainda não é autoritativa.
//  - Stamina: multiplicador sempre 1 (a stamina do jogador ainda não é
//    autoritativa) — igual ou melhor que o esperado, nunca pior.
import { ZONES, MONSTERS, boostedZoneForDate, BOSS_MONSTER_IDS } from '../vendor/domain/bestiary.js?v=135';
import {
  spawnMonsterInstance, calcDamage, monsterAttack, computeMaxHp, computeMaxMana,
  computeAtk, computeDef, equippedWeaponSkillId, spellAttackDamage, spellHealAmount, runeDamage, potionRestore,
} from '../vendor/domain/combatFormulas.js?v=156';
import { worldXpMultiplier, worldGoldMultiplier } from '../vendor/domain/progression.js?v=128';
import { zoneMultiplier, resolveMonsterLoot } from '../vendor/domain/adminConfig.js?v=128';
import { XP_TABLE, VOC_TRAINING, applySkillGain } from '../vendor/domain/character.js?v=156';
import { ITEMS, EQUIPPABLE_TYPES, equippableFallbackPool, canUsePotion, resolveEquippedItem } from '../vendor/domain/items.js?v=136';
import { RARITY_TIERS, rollIndependentRarityTiers } from '../vendor/domain/rarity.js?v=126';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../vendor/domain/spells.js?v=126';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../vendor/domain/rtcConfig.js?v=158';
import { elementMod } from '../vendor/domain/elements.js?v=125';
import { deathXpLossPct, reviveHpPct } from '../vendor/domain/blessings.js?v=125';
import { getGameConfig } from './gameConfig.js';
import { selectOne, selectMany, insertRow, upsertRow, updateRows } from './db.js';

// sessionId -> objeto de sessão (ver startSession) — tudo em memória; só
// existe enquanto ESTE processo está de pé (ver reapStaleSessionsOnBoot).
const live = new Map();

const ATTACK_GROUP_CD_MS = 2000;
const POTION_CD_MS = 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// atk/def são recalculados a cada tick a partir de session.skills (que MUDA
// com o treino, ver trainSkill) — só equipamento/relíquias ficam travados
// pra sessão inteira (mudar de item exige parar e começar de novo a caçada).
function getAtk(session) {
  return computeAtk({ vocation: session.vocation, level: session.level, skills: session.skills, equipment: session.equipment, relics: session.relics });
}
function getDef(session) {
  return computeDef({ skills: session.skills, equipment: session.equipment, relics: session.relics });
}

async function incrementInventory(userId, slot, itemId, delta) {
  const existing = await selectOne('player_inventory', { user_id: userId, slot, item_id: itemId });
  if (delta > 0 && !existing) {
    const rows = await selectMany('player_inventory', { user_id: userId, slot });
    if (rows.length >= 20) return false; // bag cheia (BAG_MAX_SLOTS) — não captura item NOVO
  }
  const newQty = Math.max(0, (existing ? Number(existing.qty) : 0) + delta);
  await upsertRow('player_inventory', { user_id: userId, slot, item_id: itemId, qty: newQty, updated_at: new Date().toISOString() }, 'user_id,slot,item_id');
  return true;
}

function isSpellReady(session, id) { return (session.spellCdUntil[id] || 0) <= Date.now(); }
function startSpellCd(session, id, seconds) { if (seconds > 0) session.spellCdUntil[id] = Date.now() + seconds * 1000; }
function isAttackGroupReady(session) { return session.attackGroupCdUntil <= Date.now(); }
function startAttackGroupCd(session) { session.attackGroupCdUntil = Date.now() + ATTACK_GROUP_CD_MS; }

function trainSkill(session, skillId, amount, cfg) {
  if (!session.skills[skillId]) return;
  const { sk } = applySkillGain(session.skills, skillId, amount * cfg.skillRate, session.vocation);
  session.skills = sk;
}

// Cura automática (spell + poções) — mesmo espírito de applyRtcHealing em
// src/application/huntUseCases.js, mas só o essencial (sem log/eventos).
async function applyRtcHealing(session, cfg) {
  const rtc = session.rtc || {};
  const healSpellId = rtc.healSpell || defaultHealSpellId(session.vocation);
  const healSpell = isSpellAvailable(healSpellId, session.vocation, session.level) ? SPELLS[healSpellId] : null;
  const hpPct = (session.hp / session.maxHp) * 100;
  if (healSpell && session.hp > 0 && hpPct < (rtc.healSpellThreshold || 0) && session.mana >= healSpell.mana && isSpellReady(session, healSpellId)) {
    const heal = Math.min(session.maxHp - session.hp, spellHealAmount({ spell: healSpell, level: session.level, magicLevel: (session.skills.magic && session.skills.magic.lv) || 0 }));
    session.hp = Math.min(session.maxHp, session.hp + heal);
    session.mana -= healSpell.mana;
    startSpellCd(session, healSpellId, healSpell.cd);
    trainSkill(session, 'magic', healSpell.mana, cfg);
  }

  const potionReady = Date.now() >= session.potionCdUntil;
  if (potionReady && rtc.healPotion && session.hp > 0 && ((session.hp / session.maxHp) * 100) < (rtc.healPotionThreshold || 0)) {
    const item = ITEMS[rtc.healPotion];
    if (item && canUsePotion(item, session.vocation, session.level)) {
      const row = await selectOne('player_inventory', { user_id: session.userId, slot: session.slot, item_id: rtc.healPotion });
      if (row && Number(row.qty) > 0) {
        session.hp = Math.min(session.maxHp, session.hp + potionRestore(item.heal));
        session.potionCdUntil = Date.now() + POTION_CD_MS;
        await incrementInventory(session.userId, session.slot, rtc.healPotion, -1);
      }
    }
  }

  if (Date.now() >= session.potionCdUntil && rtc.manaPotion && session.mana < session.maxMana && ((session.mana / session.maxMana) * 100) < (rtc.manaPotionThreshold || 0)) {
    const item = ITEMS[rtc.manaPotion];
    if (item && canUsePotion(item, session.vocation, session.level)) {
      const row = await selectOne('player_inventory', { user_id: session.userId, slot: session.slot, item_id: rtc.manaPotion });
      if (row && Number(row.qty) > 0) {
        session.mana = Math.min(session.maxMana, session.mana + potionRestore(item.mana));
        session.potionCdUntil = Date.now() + POTION_CD_MS;
        await incrementInventory(session.userId, session.slot, rtc.manaPotion, -1);
      }
    }
  }
}

// Persiste hp/mana/skills desta sessão em player_stats/player_skills — chamado
// a cada kill e periodicamente (ver startSession: flushInterval), pra não
// perder mais que alguns segundos de estado se o processo cair no meio de uma
// luta sem matar nada.
async function flushVitals(session) {
  try {
    await updateRows('player_stats', { user_id: session.userId, slot: session.slot }, { hp: session.hp, mana: session.mana });
    await upsertRow('player_skills', { user_id: session.userId, slot: session.slot, skills: session.skills, updated_at: new Date().toISOString() }, 'user_id,slot');
  } catch (e) { console.error('flushVitals falhou', session.id, e.message); }
}

async function settleKill(session, mon, cfg) {
  const zoneGoldMult = zoneMultiplier(cfg, session.zoneId, 'gold', 1);
  const zoneXpMult = zoneMultiplier(cfg, session.zoneId, 'xp', 1);
  const isBoostedToday = session.zoneId === boostedZoneForDate(todayStr());
  const boostedMult = isBoostedToday ? 1.5 : 1;
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zoneGoldMult * worldGoldMultiplier(session.world) * boostedMult * cfg.goldRate);
  const xpGained = Math.floor(mon.xp * zoneXpMult * worldXpMultiplier(session.world) * boostedMult * cfg.xpRate);

  const row = await selectOne('player_stats', { user_id: session.userId, slot: session.slot });
  const gold = (row ? Number(row.gold) : 0) + goldGained;
  const totalGoldEarned = (row ? Number(row.total_gold_earned) : 0) + goldGained;
  const totalKills = (row ? Number(row.total_kills) : 0) + 1;
  let xp = (row ? Number(row.xp) : 0) + xpGained;
  let level = row ? row.level : session.level;
  while (level < 100 && xp >= XP_TABLE[level - 1]) {
    xp -= XP_TABLE[level - 1];
    level++;
  }
  const leveledUp = level > session.level;
  session.level = level;
  if (leveledUp) {
    session.maxHp = computeMaxHp({ vocation: session.vocation, level, equipment: session.equipment, relics: session.relics });
    session.maxMana = computeMaxMana({ vocation: session.vocation, level });
    session.hp = session.maxHp;
    session.mana = session.maxMana;
  }

  await upsertRow('player_stats', {
    user_id: session.userId, slot: session.slot, gold, xp, level,
    total_gold_earned: totalGoldEarned, total_kills: totalKills,
    hp: session.hp, mana: session.mana, updated_at: new Date().toISOString(),
  }, 'user_id,slot');
  await updateRows('hunt_sessions', { id: session.id }, { last_settled_at: new Date().toISOString() });
  await upsertRow('player_skills', { user_id: session.userId, slot: session.slot, skills: session.skills, updated_at: new Date().toISOString() }, 'user_id,slot');

  const lootTable = resolveMonsterLoot(cfg, mon.defKey, mon.loot);
  const lootGained = [];
  for (const [itemId, chance] of lootTable) {
    if (Math.random() < chance * cfg.lootRate) {
      const captured = await incrementInventory(session.userId, session.slot, itemId, 1);
      if (captured) lootGained.push(itemId);
    }
  }

  const relicsGained = [];
  if (session.bossOnly && BOSS_MONSTER_IDS.has(mon.defKey) && Math.random() < cfg.relicDropChance) {
    const equippablePool = mon.loot.map(([id]) => id).filter(id => ITEMS[id] && EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    const pool = equippablePool.length > 0 ? equippablePool : equippableFallbackPool(mon.xp);
    if (pool.length > 0) {
      const hitTiers = rollIndependentRarityTiers(cfg.rarityWeights);
      for (const rarity of hitTiers) {
        const itemId = pool[Math.floor(Math.random() * pool.length)];
        const tier = RARITY_TIERS[rarity];
        const relic = await insertRow('player_relics', {
          user_id: session.userId, slot: session.slot, item_id: itemId, rarity,
          bonus_pct: tier.bonusPct, source_session_id: session.id, awarded_at: new Date().toISOString(),
        });
        relicsGained.push(relic);
      }
    }
  }

  session.lastKill = { monster: mon.name, gold: goldGained, xp: xpGained, loot: lootGained, relics: relicsGained, at: Date.now() };
}

// Um "tick" inteiro: golpe básico + magia/runa (por prioridade RTC) + cura +
// contra-ataque do monstro + morte — igual em espírito ao doHuntTick do
// cliente (src/application/huntUseCases.js), só sem respingo de área.
async function resolveTick(session) {
  const cfg = await getGameConfig();
  const zone = ZONES[session.zoneId];
  const voc = VOC_TRAINING[session.vocation];
  const mon = session.currentMonster;

  // (1) golpe básico
  const atk = getAtk(session);
  let basicDmg = calcDamage(atk, mon.def) * elementMod(mon.defKey, 'physical');
  if (voc.attackSkill === 'magic') basicDmg *= 0.5; // poke fraco do mago, mesma calibragem do cliente
  mon.hp -= Math.max(1, Math.floor(basicDmg));
  if (voc.attackSkill !== 'magic') {
    const meleeSkillId = equippedWeaponSkillId(session.equipment, session.relics);
    trainSkill(session, meleeSkillId, meleeSkillId === 'distance' ? 2 : 1, cfg);
  }

  // (2) magia/runa por prioridade (RTC)
  const rtc = session.rtc || {};
  const magic = (session.skills.magic && session.skills.magic.lv) || 0;
  const healSpellIdForReserve = rtc.healSpell || defaultHealSpellId(session.vocation);
  const healSpellForReserve = isSpellAvailable(healSpellIdForReserve, session.vocation, session.level) ? SPELLS[healSpellIdForReserve] : null;
  const healManaReserve = healSpellForReserve ? healSpellForReserve.mana : 0;

  if (isAttackGroupReady(session) && mon.hp > 0) {
    const ready = normalizeAttackSpells(rtc).map(entry => {
      if (isRuneEntry(entry)) {
        const id = runeEntryId(entry);
        const rune = ITEMS[id];
        return rune && canUseAttackRune(id, session.vocation, magic) ? { kind: 'rune', id, rune } : null;
      }
      const s = SPELLS[entry];
      const ok = s && isSpellAvailable(entry, session.vocation, session.level) && session.mana - healManaReserve >= s.mana && isSpellReady(session, entry);
      return ok ? { kind: 'spell', id: entry, s } : null;
    }).filter(Boolean);

    // Runa: precisa ESTAR no inventário de verdade (checagem live — é
    // consumível, não dá pra confiar num snapshot do início da sessão).
    let pick = null;
    for (const cand of ready) {
      if (cand.kind === 'spell') { pick = cand; break; }
      const row = await selectOne('player_inventory', { user_id: session.userId, slot: session.slot, item_id: cand.id });
      if (row && Number(row.qty) > 0) { pick = cand; break; }
    }

    if (pick && pick.kind === 'rune') {
      const rune = pick.rune;
      const dmg = runeDamage({ rune, level: session.level, magicLevel: magic }) * elementMod(mon.defKey, rune.element || 'physical');
      mon.hp -= Math.max(1, Math.floor(dmg));
      await incrementInventory(session.userId, session.slot, pick.id, -1);
      startAttackGroupCd(session);
    } else if (pick && pick.kind === 'spell') {
      const atkSpell = pick.s;
      const meleeSkillId = equippedWeaponSkillId(session.equipment, session.relics);
      const meleeSkill = (session.skills[meleeSkillId] && session.skills[meleeSkillId].lv) || 0;
      const eqWeapon = resolveEquippedItem(session.equipment.weapon, session.relics);
      const weaponAtk = (eqWeapon && eqWeapon.atk) || 7;
      const distanceSkill = (session.skills.distance && session.skills.distance.lv) || 0;
      const dmg = spellAttackDamage({ spell: atkSpell, level: session.level, magicLevel: magic, meleeSkill, weaponAtk, distanceSkill }) * elementMod(mon.defKey, atkSpell.element);
      mon.hp -= Math.max(1, Math.floor(dmg));
      session.mana -= atkSpell.mana;
      startSpellCd(session, pick.id, atkSpell.cd);
      startAttackGroupCd(session);
      trainSkill(session, 'magic', atkSpell.mana, cfg);
    }
  }

  // Morte do monstro (só o alvo — sem respingo de área neste marco).
  if (mon.hp <= 0) {
    await settleKill(session, mon, cfg);
    session.currentMonster = null;
    session.nextSpawnAt = Date.now() + 1500;
    return;
  }

  // (3) contra-ataque do monstro + cura automática
  const atkResult = monsterAttack(mon, getDef(session));
  session.hp = Math.max(0, session.hp - atkResult.dmg);
  await applyRtcHealing(session, cfg);

  if (session.hp <= 0) {
    // Bênçãos ainda não autoritativas (ver comentário no topo) — perda de XP
    // sempre no valor SEM bênção (pior caso pro jogador, nunca melhor).
    const lostPct = deathXpLossPct(0);
    const row = await selectOne('player_stats', { user_id: session.userId, slot: session.slot });
    const curXp = row ? Number(row.xp) : 0;
    const xpLost = Math.floor(curXp * lostPct);
    session.hp = Math.floor(session.maxHp * reviveHpPct(0));
    await upsertRow('player_stats', { user_id: session.userId, slot: session.slot, xp: Math.max(0, curXp - xpLost), hp: session.hp, mana: session.mana, updated_at: new Date().toISOString() }, 'user_id,slot');
    session.currentMonster = null;
    session.nextSpawnAt = Date.now() + 1500;
  }
}

function doTick(session) {
  const zone = ZONES[session.zoneId];
  if (!zone || session.busy) return;
  if (!session.currentMonster) {
    if (Date.now() < session.nextSpawnAt) return;
    session.currentMonster = spawnMonsterInstance(zone, MONSTERS, session.level, 1, null);
    return;
  }
  session.busy = true;
  resolveTick(session).catch(err => console.error('resolveTick falhou', session.id, err.message)).finally(() => { session.busy = false; });
}

export function startSession(session) {
  session.currentMonster = null;
  session.nextSpawnAt = Date.now();
  session.spellCdUntil = {};
  session.attackGroupCdUntil = 0;
  session.potionCdUntil = 0;
  const tickMs = Math.max(400, 2400 / Math.max(0.1, session.spd));
  session.timer = setInterval(() => doTick(session), tickMs);
  session.flushTimer = setInterval(() => flushVitals(session).catch(() => {}), 5000);
  live.set(session.id, session);
}

export function stopSession(sessionId) {
  const s = live.get(sessionId);
  if (!s) return;
  clearInterval(s.timer);
  clearInterval(s.flushTimer);
  flushVitals(s).catch(() => {});
  live.delete(sessionId);
}

export function getLiveSession(sessionId) {
  return live.get(sessionId);
}

// Ao subir (deploy/restart), qualquer sessão marcada "active" no banco perdeu
// seu tick loop em memória (o processo anterior morreu) — fecha todas no boot
// (senão o índice único hunt_sessions_one_active_per_slot travaria um hunt-
// start novo pra sempre).
export async function reapStaleSessionsOnBoot() {
  try {
    await updateRows('hunt_sessions', { active: true }, { active: false });
  } catch (e) {
    console.error('reapStaleSessionsOnBoot falhou', e.message);
  }
}
