// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G } from './gameStore.js';
import { ZONES } from '../domain/bestiary.js';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js';
import { SPELLS, isSpellAvailable } from '../domain/spells.js';
import { computeRtcMods, computeBoostMods } from '../domain/shopCatalog.js';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js';
import { calcDamage, spawnMonsterInstance } from '../domain/combatFormulas.js';
import { ITEMS } from '../domain/items.js';
import { MONSTERS } from '../domain/bestiary.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { getAtk, getDef, getMaxHp, getMaxMana, getSpd, getEquippedWeaponSkillId } from './stats.js';
import { trainSkill } from './skillUseCases.js';
import { addItemToInventory } from './inventoryCore.js';
import { checkBpTier } from './battlePassUseCases.js';

let huntInterval = null;
let regenInterval = null;
let currentMonster = null;

export function getCurrentMonster() {
  return currentMonster;
}

export function selectZone(zoneId) {
  G.activeZone = zoneId;
  if (G.hunting) { stopHunt(); startHunt(); }
}

export function toggleHunt() {
  if (G.hunting) stopHunt(); else startHunt();
}

export function startHunt() {
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: 'Escolha uma vocação primeiro!', type: 'error' }); return; }
  if (!G.activeZone) { emit(EVENTS.NOTIFY, { msg: 'Selecione uma zona de caça!', type: 'error' }); return; }
  const zone = ZONES[G.activeZone];
  if (G.level < zone.minLevel) { emit(EVENTS.NOTIFY, { msg: `Nível mínimo: ${zone.minLevel}`, type: 'error' }); return; }
  G.hunting = true;
  emit(EVENTS.HUNT_BUTTON, { hunting: true });
  emit(EVENTS.LOG, `<span class="log-info">🗺️ Entrando em ${zone.icon} ${zone.name}...</span>`);
  huntInterval = setInterval(doHuntTick, Math.max(400, 1200 / getSpd()));
}

export function stopHunt() {
  G.hunting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  currentMonster = null;
  emit(EVENTS.HUNT_BUTTON, { hunting: false });
  emit(EVENTS.LOG, '<span class="log-info">⏸ Caçada pausada.</span>');
}

export function doHuntTick() {
  if (!G.hunting || !G.activeZone) return;

  if (!currentMonster) {
    currentMonster = spawnMonsterInstance(ZONES[G.activeZone], MONSTERS, G.level);
    emit(EVENTS.LOG, `${currentMonster.icon} <span class="log-info">${currentMonster.name} apareceu!</span>`);
    emit(EVENTS.MONSTER_DISPLAY, {});
    return; // o monstro aparece neste tick; o combate começa no próximo
  }

  const zone = ZONES[G.activeZone];
  const rtc = computeRtcMods(G.rtc);
  const voc = VOC_TRAINING[G.vocation];

  // Player attacks monster
  let playerDmg = calcDamage(getAtk(), currentMonster.def);
  // RTC auto-cast: spell de ataque selecionada na aba Spells
  const atkSpell = G.spells.attack && isSpellAvailable(G.spells.attack, G.vocation, G.level) ? SPELLS[G.spells.attack] : null;
  if (atkSpell && G.mana >= atkSpell.mana) {
    playerDmg = Math.floor(playerDmg * atkSpell.power);
    G.mana -= atkSpell.mana;
    trainSkill('magic', atkSpell.mana * voc.magicMult);
    emit(EVENTS.LOG, `<span class="log-xp">🗣️ "${atkSpell.words}"</span>`);
  }
  if (voc.attackSkill !== 'magic') {
    // treino da skill de arma por golpe — a arma REALMENTE equipada decide qual skill
    // sobe (sword só treina com espada equipada, axe só com machado, etc.)
    trainSkill(getEquippedWeaponSkillId(), 1 * voc.weaponMult);
  } else if (!atkSpell && G.mana >= 8) {
    // mage sem spell selecionada: golpe arcano básico
    playerDmg = Math.floor(playerDmg * 1.3);
    G.mana -= 8;
    trainSkill('magic', 8 * voc.magicMult);
  }
  playerDmg = Math.max(1, Math.floor(playerDmg * rtc.dmgMult));
  currentMonster.hp -= playerDmg;
  emit(EVENTS.LOG, `⚔️ Você causou <span class="log-dmg">${playerDmg}</span> de dano ao ${currentMonster.name}.`);
  emit(EVENTS.MONSTER_DISPLAY, { hit: true });

  if (currentMonster.hp <= 0) {
    resolveMonsterKill(zone, rtc);
    return;
  }

  // Monster attacks player (defender treina Shielding, como no Tibia — só com escudo equipado)
  const monsterDmg = calcDamage(currentMonster.atk, getDef());
  G.hp = Math.max(0, G.hp - monsterDmg);
  if (G.equipment.shield) trainSkill('shielding', 1 * voc.shieldMult);
  emit(EVENTS.LOG, `🩸 ${currentMonster.name} causou <span class="log-dmg">${monsterDmg}</span> de dano em você.`);
  emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true });

  // RTC Smart Healing: usa a spell de cura selecionada na aba Spells
  const healSpell = G.spells.heal && isSpellAvailable(G.spells.heal, G.vocation, G.level) ? SPELLS[G.spells.heal] : SPELLS.exura;
  if (rtc.smartHeal && G.hp > 0 && G.hp < getMaxHp() * 0.4 && isSpellAvailable(G.spells.heal || 'exura', G.vocation, G.level) && G.mana >= healSpell.mana) {
    const heal = Math.floor(getMaxHp() * healSpell.power);
    G.hp = Math.min(getMaxHp(), G.hp + heal);
    G.mana -= healSpell.mana;
    trainSkill('magic', healSpell.mana * voc.magicMult);
    emit(EVENTS.LOG, `💊 <span class="log-heal">[RTC] "${healSpell.words}": +${heal} HP</span> (-${healSpell.mana} mana)`);
  }

  if (G.hp <= 0) {
    emit(EVENTS.LOG, `<span class="log-kill">💔 Você morreu! Retornando ao templo...</span>`);
    G.hp = Math.floor(getMaxHp() * 0.3);
    G.xp = Math.floor(G.xp * 0.95); // 5% xp loss
    currentMonster = null;
    stopHunt();
  }

  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);
}

// Paga XP/gold/loot pela morte da criatura atual — usado tanto por um golpe normal
// (doHuntTick) quanto por uma runa de ataque usada manualmente (inventoryUseCases),
// para que nenhuma via de dano "sonegue" a recompensa da morte.
export function resolveMonsterKill(zone, rtc) {
  const boosts = computeBoostMods(G.boosts, Date.now());
  let goldGained = Math.floor((currentMonster.gold[0] + Math.random() * (currentMonster.gold[1] - currentMonster.gold[0])) * zone.goldMult * worldGoldMultiplier(G.currentWorld) * rtc.goldMult * boosts.gold);
  goldGained = Math.max(0, goldGained - Math.floor(goldGained * rtc.goldTax));
  const xpGained = Math.floor(currentMonster.xp * zone.xpMult * worldXpMultiplier(G.currentWorld) * rtc.xpMult * boosts.xp);

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills++;

  // Kill counters da zona atual
  G.killCounters = G.killCounters || {};
  G.killCounters[currentMonster.defKey] = (G.killCounters[currentMonster.defKey] || 0) + 1;

  // Battle Pass XP
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();

  emit(EVENTS.LOG, `<span class="log-kill">💀 ${currentMonster.name} morreu!</span> +${xpGained} XP, +${goldGained} 💰`);

  // Loot
  const lootLine = [];
  currentMonster.loot.forEach(([itemId, chance]) => {
    if (Math.random() < chance + rtc.lootBonus + boosts.loot) {
      addItemToInventory(itemId);
      const item = ITEMS[itemId];
      lootLine.push(`${item.icon} ${item.name}`);
    }
  });
  if (lootLine.length > 0) emit(EVENTS.LOG, `<span class="log-loot">📦 Loot: ${lootLine.join(', ')}</span>`);

  gainXp(xpGained);
  const killedId = currentMonster.defKey;
  // anuncia a morte pra quem precisar reagir (ex.: progresso de Linked Tasks)
  // sem a caçada precisar saber que tasks existem
  emit(EVENTS.MONSTER_KILLED, { monsterId: killedId });

  currentMonster = null;
  emit(EVENTS.MONSTER_DISPLAY, { killed: killedId });
  emit(EVENTS.LOOT);
  emit(EVENTS.KILL_COUNTERS);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.INVENTORY);
}

export function gainXp(amount) {
  G.xp += amount;
  while (G.level < 100 && G.xp >= XP_TABLE[G.level - 1]) {
    G.xp -= XP_TABLE[G.level - 1];
    G.level++;
    G.hp = getMaxHp();
    G.mana = getMaxMana();
    emit(EVENTS.LOG, `<span class="log-xp">🎉 LEVEL UP! Você chegou ao nível ${G.level}!</span>`);
    emit(EVENTS.NOTIFY, { msg: `Level Up! Nível ${G.level}`, type: 'success' });
    emit(EVENTS.LEVEL_UP, { level: G.level });
    emit(EVENTS.CHAR_INFO);
    emit(EVENTS.WORLDS_PANEL);
    emit(EVENTS.ZONE_PICKER);
  }
  emit(EVENTS.BARS);
}

export function startRegen() {
  if (regenInterval) clearInterval(regenInterval);
  regenInterval = setInterval(() => {
    if (!G.vocation) return;
    const v = VOCATIONS[G.vocation];
    if (!G.hunting) {
      G.hp = Math.min(getMaxHp(), G.hp + v.hpRegen * 3);
      G.mana = Math.min(getMaxMana(), G.mana + v.manaRegen * 3);
    } else {
      G.hp = Math.min(getMaxHp(), G.hp + v.hpRegen);
      G.mana = Math.min(getMaxMana(), G.mana + v.manaRegen);
    }
    emit(EVENTS.BARS);
    emit(EVENTS.HEADER_STATS);
  }, 2000);
}
