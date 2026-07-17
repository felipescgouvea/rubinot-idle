// Motor de caçada AUTORITATIVO.
//
// Marco 2: cada kill é decidido por ESTE processo, rodando sozinho, contra o
// relógio real do servidor. Marco 3: loot + relíquias. Marco 4: atk/def/spd
// vêm de player_stats/player_skills/player_equipment. Marco 5: combate real
// (magia/runa por prioridade RTC, cura, contra-ataque, morte, treino de
// skill). Marco 6: respingo de área (pack de monstros, não só alvo único),
// bênçãos e stamina autoritativas — fecha as 3 limitações que ainda
// restavam (documentadas antes, agora corrigidas).
import { ZONES, MONSTERS, boostedZoneForDate, BOSS_MONSTER_IDS } from '../../src/domain/bestiary.js?v=136';
import {
  spawnMonsterInstance, calcDamage, monsterAttack, computeMaxHp, computeMaxMana,
  computeAtk, computeDef, equippedWeaponSkillId, spellAttackDamage, spellHealAmount, runeDamage, potionRestore,
} from '../../src/domain/combatFormulas.js?v=157';
import { worldXpMultiplier, worldGoldMultiplier } from '../../src/domain/progression.js?v=128';
import { zoneMultiplier, resolveMonsterLoot, resolveZoneSpawn } from '../../src/domain/adminConfig.js?v=128';
import { XP_TABLE, VOC_TRAINING, applySkillGain } from '../../src/domain/character.js?v=156';
import { ITEMS, EQUIPPABLE_TYPES, equippableFallbackPool, canUsePotion, resolveEquippedItem } from '../../src/domain/items.js?v=138';
import { SHOP_ITEMS } from '../../src/domain/shopCatalog.js?v=128';
import { RARITY_TIERS, rollIndependentRarityTiers } from '../../src/domain/rarity.js?v=126';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../../src/domain/spells.js?v=126';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../../src/domain/rtcConfig.js?v=159';
import { elementMod } from '../../src/domain/elements.js?v=125';
import { deathXpLossPct, reviveHpPct, MAX_BLESSINGS } from '../../src/domain/blessings.js?v=125';
import { areaMaxTargets, isAreaAttack } from '../../src/domain/attackAreas.js?v=125';
import { staminaXpMult } from '../../src/domain/stamina.js?v=125';
import { getGameConfig } from './gameConfig.js';
import { selectOne, selectMany, selectLatest, insertRow, upsertRow, updateRows, deleteRows } from './db.js';

// sessionId -> objeto de sessão (ver startSession) — tudo em memória; só
// existe enquanto ESTE processo está de pé (ver reapStaleSessionsOnBoot).
const live = new Map();

const ATTACK_GROUP_CD_MS = 2000;
const POTION_CD_MS = 1000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// atk/def são recalculados a cada tick a partir de session.skills (que MUDA
// com o treino) — só equipamento/relíquias ficam travados pra sessão inteira.
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
  const healSpellId = rtc.healSpell || defaultHealSpellId(session.vocation, session.level);
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

// Persiste hp/mana/skills/stamina desta sessão — a cada kill e periodicamente
// (ver startSession: flushTimer), pra não perder mais que alguns segundos de
// estado se o processo cair no meio de uma luta sem matar nada.
async function flushVitals(session) {
  try {
    await updateRows('player_stats', { user_id: session.userId, slot: session.slot }, { hp: session.hp, mana: session.mana, stamina: session.stamina });
    await upsertRow('player_skills', { user_id: session.userId, slot: session.slot, skills: session.skills, updated_at: new Date().toISOString() }, 'user_id,slot');
  } catch (e) { console.error('flushVitals falhou', session.id, e.message); }
}

// Stamina cai com o tempo REAL de caçada decorrido (não por tick nominal —
// ticks podem atrasar) e só se o Admin ligou (cfg.staminaEnabled). Mesma
// taxa do cliente: 1 minuto de stamina por minuto caçando.
function decayStamina(session, cfg, elapsedMs) {
  if (!cfg.staminaEnabled) return;
  session.stamina = Math.max(0, session.stamina - elapsedMs / 60000);
}

async function settleKill(session, mon, cfg) {
  const zoneGoldMult = zoneMultiplier(cfg, session.zoneId, 'gold', 1);
  const zoneXpMult = zoneMultiplier(cfg, session.zoneId, 'xp', 1);
  const isBoostedToday = session.zoneId === boostedZoneForDate(todayStr());
  const boostedMult = isBoostedToday ? 1.5 : 1;
  const staminaMult = cfg.staminaEnabled ? staminaXpMult(session.stamina) : 1;
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zoneGoldMult * worldGoldMultiplier(session.world) * boostedMult * cfg.goldRate);
  const xpGained = Math.floor(mon.xp * zoneXpMult * worldXpMultiplier(session.world) * boostedMult * cfg.xpRate * staminaMult);

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
    hp: session.hp, mana: session.mana, stamina: session.stamina, updated_at: new Date().toISOString(),
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

  session.lastKill = { monster: mon.name, defKey: mon.defKey, gold: goldGained, xp: xpGained, loot: lootGained, relics: relicsGained, at: Date.now() };
}

// Um "tick" inteiro: golpe básico (só no alvo da frente) + magia/runa por
// prioridade RTC — COM respingo de área real quando a magia/runa é de área
// (isAreaAttack/areaMaxTargets, ver domain/attackAreas.js) — + cura +
// contra-ataque + morte. Fiel ao doHuntTick do cliente.
async function resolveTick(session) {
  const cfg = await getGameConfig();
  const voc = VOC_TRAINING[session.vocation];
  const pack = session.currentPack;
  const primary = pack[0];
  const now = Date.now();
  decayStamina(session, cfg, now - (session.lastTickAt || now));
  session.lastTickAt = now;

  // (1) golpe básico — só o alvo da frente (fiel ao cliente: o básico nunca
  // tem área, só magia/runa podem ter).
  const atk = getAtk(session);
  let basicDmg = calcDamage(atk, primary.def) * elementMod(primary.defKey, 'physical');
  if (voc.attackSkill === 'magic') basicDmg *= 0.5; // poke fraco do mago, mesma calibragem do cliente
  primary.hp -= Math.max(1, Math.floor(basicDmg));
  if (voc.attackSkill !== 'magic') {
    const meleeSkillId = equippedWeaponSkillId(session.equipment, session.relics);
    trainSkill(session, meleeSkillId, meleeSkillId === 'distance' ? 2 : 1, cfg);
  }

  // (2) magia/runa por prioridade (RTC), com respingo de área real
  const rtc = session.rtc || {};
  const magic = (session.skills.magic && session.skills.magic.lv) || 0;
  const healSpellIdForReserve = rtc.healSpell || defaultHealSpellId(session.vocation, session.level);
  const healSpellForReserve = isSpellAvailable(healSpellIdForReserve, session.vocation, session.level) ? SPELLS[healSpellIdForReserve] : null;
  const healManaReserve = healSpellForReserve ? healSpellForReserve.mana : 0;

  if (isAttackGroupReady(session) && primary.hp > 0) {
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

    // Runa: precisa ESTAR no inventário de verdade (checagem live).
    let pick = null;
    for (const cand of ready) {
      if (cand.kind === 'spell') { pick = cand; break; }
      const row = await selectOne('player_inventory', { user_id: session.userId, slot: session.slot, item_id: cand.id });
      if (row && Number(row.qty) > 0) { pick = cand; break; }
    }

    let areaId = 'single', element = null, hitFn = null;
    if (pick && pick.kind === 'rune') {
      const rune = pick.rune;
      areaId = rune.area || 'single';
      element = rune.element || 'physical';
      hitFn = () => runeDamage({ rune, level: session.level, magicLevel: magic });
      await incrementInventory(session.userId, session.slot, pick.id, -1);
      startAttackGroupCd(session);
    } else if (pick && pick.kind === 'spell') {
      const atkSpell = pick.s;
      areaId = atkSpell.area || 'single';
      element = atkSpell.element;
      const meleeSkillId = equippedWeaponSkillId(session.equipment, session.relics);
      const meleeSkill = (session.skills[meleeSkillId] && session.skills[meleeSkillId].lv) || 0;
      const eqWeapon = resolveEquippedItem(session.equipment.weapon, session.relics);
      const weaponAtk = (eqWeapon && eqWeapon.atk) || 7;
      const distanceSkill = (session.skills.distance && session.skills.distance.lv) || 0;
      hitFn = () => spellAttackDamage({ spell: atkSpell, level: session.level, magicLevel: magic, meleeSkill, weaponAtk, distanceSkill });
      session.mana -= atkSpell.mana;
      startSpellCd(session, pick.id, atkSpell.cd);
      startAttackGroupCd(session);
      trainSkill(session, 'magic', atkSpell.mana, cfg);
    }

    if (hitFn) {
      if (primary.hp > 0) primary.hp -= Math.max(1, Math.floor(hitFn() * elementMod(primary.defKey, element)));
      if (isAreaAttack(areaId) && pack.length > 1) {
        const maxTargets = areaMaxTargets(areaId);
        pack.slice(1, maxTargets).forEach(tgt => {
          tgt.hp -= Math.max(1, Math.floor(hitFn() * elementMod(tgt.defKey, element)));
        });
      }
    }
  }

  // Resolve TODAS as mortes deste tick (o alvo da frente e/ou os atingidos
  // pelo respingo de área) — mesmo espírito de doHuntTick no cliente.
  const primaryDied = primary.hp <= 0;
  const deaths = pack.filter(m => m.hp <= 0);
  for (const m of deaths) await settleKill(session, m, cfg);
  session.currentPack = pack.filter(m => m.hp > 0);

  if (primaryDied || !session.currentPack.length) {
    if (!session.currentPack.length) session.nextSpawnAt = Date.now() + 1500;
    await flushVitals(session);
    return;
  }

  // (3) contra-ataque do monstro da frente (o que sobrou) + cura automática
  const newPrimary = session.currentPack[0];
  const atkResult = monsterAttack(newPrimary, getDef(session));
  session.hp = Math.max(0, session.hp - atkResult.dmg);
  await applyRtcHealing(session, cfg);

  if (session.hp <= 0) {
    // Bênçãos AUTORITATIVAS (lidas ao vivo — podem ter sido compradas a
    // qualquer momento, ver server/src/index.js: /buy-blessing) e consumidas
    // na morte (não recuperam sozinhas — precisa comprar de novo).
    const row = await selectOne('player_stats', { user_id: session.userId, slot: session.slot });
    const blessings = row ? Math.min(MAX_BLESSINGS, Number(row.blessings) || 0) : 0;
    const curXp = row ? Number(row.xp) : 0;
    const xpLost = Math.floor(curXp * deathXpLossPct(blessings));
    session.hp = Math.floor(session.maxHp * reviveHpPct(blessings));
    await upsertRow('player_stats', {
      user_id: session.userId, slot: session.slot, xp: Math.max(0, curXp - xpLost),
      hp: session.hp, mana: session.mana, stamina: session.stamina, blessings: 0, updated_at: new Date().toISOString(),
    }, 'user_id,slot');
    session.currentPack = [];
    session.nextSpawnAt = Date.now() + 1500;
  }
}

function doTick(session) {
  if (session.busy) return;
  session.busy = true;
  tick(session).catch(err => console.error('tick falhou', session.id, err.message)).finally(() => { session.busy = false; });
}

async function tick(session) {
  const zone = ZONES[session.zoneId];
  if (!zone) return;
  if (!session.currentPack || !session.currentPack.length) {
    if (Date.now() < session.nextSpawnAt) return;
    const cfg = await getGameConfig();
    const spawnCfg = resolveZoneSpawn(cfg, session.zoneId, zone.monsters);
    const packSize = spawnCfg.packMin + Math.floor(Math.random() * (spawnCfg.packMax - spawnCfg.packMin + 1));
    session.currentPack = Array.from({ length: packSize }, () => spawnMonsterInstance(zone, MONSTERS, session.level, 1, spawnCfg.weights));
    session.lastTickAt = Date.now();
    return;
  }
  await resolveTick(session);
}

export function startSession(session) {
  session.currentPack = [];
  session.nextSpawnAt = Date.now();
  session.spellCdUntil = {};
  session.attackGroupCdUntil = 0;
  session.potionCdUntil = 0;
  session.lastTickAt = Date.now();
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

// Poção fora de sessão viva (parado, ou caçada não iniciada nesse processo) —
// no Tibia real, beber uma poção nunca dependeu de estar em combate. Sem
// isso, o jogador ficava sem como se curar sempre que clicasse "Use" parado
// (bug reportado pelo Felipe: "aqui nao funcionou uso de poções"). Lê/escreve
// direto em player_stats (mesmo padrão do /buy-blessing), sem o tick de
// combate — maxHp/maxMana recalculados igual ao /hunt/start.
export async function usePotionStandalone(userId, slot, itemId) {
  const item = ITEMS[itemId];
  if (!item) return { error: 'item inválido' };
  if (!item.heal && !item.mana) return { error: 'item não pode ser usado assim' };

  const invRow = await selectOne('player_inventory', { user_id: userId, slot, item_id: itemId });
  if (!invRow || Number(invRow.qty) <= 0) return { error: 'item não pertence a esta conta/personagem' };

  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return { error: 'personagem sem stats' };
  // vocação só existe em hunt_sessions (snapshot do hunt-start) — pega a
  // sessão mais recente (ativa ou não), já que usar poção não exige caçar.
  const lastSession = await selectLatest('hunt_sessions', { user_id: userId, slot }, 'started_at');
  if (!lastSession) return { error: 'personagem sem vocação definida' };
  const vocation = lastSession.vocation;
  if (!canUsePotion(item, vocation, stats.level)) return { error: 'vocação/nível insuficiente pra esta poção' };

  const eqRows = await selectMany('player_equipment', { user_id: userId, slot });
  const equipment = {};
  eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });
  const relicRows = await selectMany('player_relics', { user_id: userId, slot });
  const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));
  const maxHp = computeMaxHp({ vocation, level: stats.level, equipment, relics });
  const maxMana = computeMaxMana({ vocation, level: stats.level });

  const beforeHp = Math.min(maxHp, stats.hp != null ? stats.hp : maxHp);
  const beforeMana = Math.min(maxMana, stats.mana != null ? stats.mana : maxMana);
  const hp = item.heal ? Math.min(maxHp, beforeHp + potionRestore(item.heal)) : beforeHp;
  const mana = item.mana ? Math.min(maxMana, beforeMana + potionRestore(item.mana)) : beforeMana;

  await incrementInventory(userId, slot, itemId, -1);
  await updateRows('player_stats', { user_id: userId, slot }, { hp, mana });
  return { ok: true, hp, mana, healedHp: hp - beforeHp, healedMana: mana - beforeMana };
}

// Uso MANUAL de item pela Bag (clique do jogador durante a caçada) — mesma
// checagem de posse/vocação/ML do RTC automático e a MESMA matemática
// (potionRestore/runeDamage+elementMod, ver domain/combatFormulas.js e
// domain/elements.js). Morte por runa manual passa pelo MESMO settleKill()
// do tick automático — só existe UM caminho real de gold/xp/loot/relíquia,
// nunca um segundo cálculo paralelo no cliente.
export async function useItemInSession(session, itemId) {
  const item = ITEMS[itemId];
  if (!item) return { error: 'item inválido' };

  const isPotion = !!(item.heal || item.mana);
  const isRune = item.type === 'rune' && item.dmg;
  if (!isPotion && !isRune) return { error: 'item não pode ser usado assim' };

  const row = await selectOne('player_inventory', { user_id: session.userId, slot: session.slot, item_id: itemId });
  if (!row || Number(row.qty) <= 0) return { error: 'item não pertence a esta conta/personagem' };

  if (isPotion) {
    if (!canUsePotion(item, session.vocation, session.level)) return { error: 'vocação/nível insuficiente pra esta poção' };
    const beforeHp = session.hp, beforeMana = session.mana;
    if (item.heal) session.hp = Math.min(session.maxHp, session.hp + potionRestore(item.heal));
    if (item.mana) session.mana = Math.min(session.maxMana, session.mana + potionRestore(item.mana));
    await incrementInventory(session.userId, session.slot, itemId, -1);
    await flushVitals(session);
    return { ok: true, hp: session.hp, mana: session.mana, healedHp: session.hp - beforeHp, healedMana: session.mana - beforeMana };
  }

  // Runa de ataque: mesmo gate de vocação/Magic Level do RTC (ver
  // domain/rtcConfig.js: canUseAttackRune) e só faz sentido com alvo vivo.
  const magic = (session.skills.magic && session.skills.magic.lv) || 0;
  if (!canUseAttackRune(itemId, session.vocation, magic)) return { error: 'vocação/Magic Level insuficiente pra esta runa' };
  const pack = session.currentPack;
  if (!pack || !pack.length || pack[0].hp <= 0) return { error: 'sem criatura pra mirar' };

  const cfg = await getGameConfig();
  const areaId = item.area || 'single';
  const maxTargets = isAreaAttack(areaId) ? areaMaxTargets(areaId) : 1;
  const targets = pack.slice(0, maxTargets);
  const primaryName = targets[0].name;
  let primaryDmg = 0;
  targets.forEach((mon, i) => {
    const dmg = Math.max(1, Math.floor(runeDamage({ rune: item, level: session.level, magicLevel: magic }) * elementMod(mon.defKey, item.element || 'physical')));
    mon.hp -= dmg;
    if (i === 0) primaryDmg = dmg;
  });
  await incrementInventory(session.userId, session.slot, itemId, -1);

  const deaths = pack.filter(m => m.hp <= 0);
  for (const m of deaths) await settleKill(session, m, cfg);
  session.currentPack = pack.filter(m => m.hp > 0);
  if (!session.currentPack.length) session.nextSpawnAt = Date.now() + 1500;
  await flushVitals(session);
  return {
    ok: true, hp: session.hp, mana: session.mana,
    dmg: primaryDmg, targetName: primaryName, killed: deaths.length > 0, hitCount: targets.length,
  };
}

// Vocação/nível/maxHp/maxMana pra ações fora de sessão (compra/venda/refill) —
// mesmo padrão de usePotionStandalone: vocação só existe em hunt_sessions
// (snapshot do hunt-start), então pega a mais recente, ativa ou não.
async function loadVitalsContext(userId, slot) {
  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return null;
  const lastSession = await selectLatest('hunt_sessions', { user_id: userId, slot }, 'started_at');
  if (!lastSession) return null;
  const vocation = lastSession.vocation;
  const eqRows = await selectMany('player_equipment', { user_id: userId, slot });
  const equipment = {};
  eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });
  const relicRows = await selectMany('player_relics', { user_id: userId, slot });
  const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));
  const maxHp = computeMaxHp({ vocation, level: stats.level, equipment, relics });
  const maxMana = computeMaxMana({ vocation, level: stats.level });
  return { stats, vocation, maxHp, maxMana };
}

// Comprar na Loja de Equipamentos/Artigos Mágicos (gold) — antes só mutava
// G.gold/G.inventory no cliente, sem o servidor nunca saber; o próximo
// reconcileWithServer() (a cada tick de combate ou hunt-start) sobrescrevia
// G.gold/G.inventory com os valores REAIS do banco, revertendo a compra em
// silêncio (bug reportado na varredura de QA: dinheiro gasto/item comprado
// "reaparecia"/"sumia" sozinho). Só cobre currency 'gold' — 'rubini' ainda
// não tem coluna própria em player_stats (moeda premium, sem risco de
// reconciliação hoje) e 'real' precisa de gateway de pagamento (fora de
// escopo). type 'boost' também fica de fora por ora: o servidor ainda não
// aplica G.boosts no cálculo de gold/xp (huntEngine.js: settleKill) — sem
// isso o boost seria cobrado à toa, sem efeito real; ver nota na resposta.
export async function buyShopItemStandalone(userId, slot, shopItemId, qty) {
  const s = SHOP_ITEMS.find(x => x.id === shopItemId);
  if (!s) return { error: 'item da loja não encontrado' };
  if (s.currency !== 'gold') return { error: 'esta compra ainda não é validada pelo servidor' };
  if (s.type !== 'item' && s.type !== 'refill') return { error: 'esta compra ainda não é validada pelo servidor' };

  const item = s.itemId ? ITEMS[s.itemId] : null;
  const isBulk = s.type === 'item' && item && (item.type === 'potion' || item.type === 'rune');
  const count = isBulk ? Math.max(1, Math.min(9999, Math.floor(Number(qty) || 1))) : 1;
  const total = s.price * count;

  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return { error: 'personagem sem stats' };
  if (Number(stats.gold) < total) return { error: 'saldo insuficiente' };

  if (s.type === 'item') {
    const captured = await incrementInventory(userId, slot, s.itemId, count);
    if (!captured) return { error: 'bag cheia' };
    await updateRows('player_stats', { user_id: userId, slot }, { gold: Number(stats.gold) - total });
    return { ok: true, gold: Number(stats.gold) - total };
  }

  // refill: cura hp/mana até o teto (mesma fórmula de maxHp/maxMana do hunt-start)
  const ctx = await loadVitalsContext(userId, slot);
  if (!ctx) return { error: 'personagem sem vocação definida' };
  await updateRows('player_stats', { user_id: userId, slot }, { gold: Number(stats.gold) - total, hp: ctx.maxHp, mana: ctx.maxMana });
  return { ok: true, gold: Number(stats.gold) - total, hp: ctx.maxHp, mana: ctx.maxMana };
}

// Vender item(ns) da bag — mesmo motivo do buyShopItemStandalone (gold
// creditado só no cliente era revertido no próximo reconcile). `qty` omitido
// vende TODA a pilha (equivalente ao sellAllItem do cliente).
export async function sellItemStandalone(userId, slot, itemId, qty) {
  const item = ITEMS[itemId];
  if (!item || item.sell == null) return { error: 'item não vendável' };
  const row = await selectOne('player_inventory', { user_id: userId, slot, item_id: itemId });
  const owned = row ? Number(row.qty) : 0;
  if (owned <= 0) return { error: 'item não pertence a esta conta/personagem' };
  const count = qty != null ? Math.max(1, Math.min(owned, Math.floor(Number(qty) || 1))) : owned;
  const total = item.sell * count;

  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return { error: 'personagem sem stats' };
  await incrementInventory(userId, slot, itemId, -count);
  const gold = Number(stats.gold) + total;
  await updateRows('player_stats', { user_id: userId, slot }, { gold });
  return { ok: true, gold, sold: count, total };
}

// Vender uma relíquia — preço = sell base * (1 + bonusPct*2), mesma fórmula
// do cliente (application/inventoryUseCases.js: sellRelic). Se estava
// equipada, limpa o slot (mesmo espírito de unequipItem/syncEquipment).
export async function sellRelicStandalone(userId, slot, relicId) {
  const relic = await selectOne('player_relics', { user_id: userId, slot, id: relicId });
  if (!relic) return { error: 'relíquia não pertence a esta conta/personagem' };
  const base = ITEMS[relic.item_id];
  if (!base) return { error: 'item base da relíquia não existe' };
  const price = Math.round(base.sell * (1 + Number(relic.bonus_pct) * 2));

  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return { error: 'personagem sem stats' };
  const eqRow = await selectOne('player_equipment', { user_id: userId, slot, item_id: relicId });
  if (eqRow) await updateRows('player_equipment', { user_id: userId, slot, eq_slot: eqRow.eq_slot }, { item_id: null });
  await deleteRows('player_relics', { user_id: userId, slot, id: relicId });
  const gold = Number(stats.gold) + price;
  await updateRows('player_stats', { user_id: userId, slot }, { gold });
  return { ok: true, gold, price };
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
