// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G } from './gameStore.js?v=37';
import { ZONES, boostedZoneForDate, BOSS_MONSTER_IDS, bossTierMultiplier, bossAuraClass } from '../domain/bestiary.js?v=37';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=37';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=37';
import { computeBoostMods } from '../domain/shopCatalog.js?v=37';
import { isRuneAvailableToVocation } from '../domain/rtcConfig.js?v=37';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js?v=37';
import { calcDamage, spawnMonsterInstance } from '../domain/combatFormulas.js?v=37';
import { ITEMS, EQUIPPABLE_TYPES } from '../domain/items.js?v=37';
import { MONSTERS } from '../domain/bestiary.js?v=37';
import { RARITY_TIERS, rollRarityTier } from '../domain/rarity.js?v=37';
import { emit, EVENTS } from '../shared/eventBus.js?v=37';
import { getAtk, getDef, getMaxHp, getMaxMana, getSpd, getEquippedWeaponSkillId } from './stats.js?v=37';
import { trainSkill } from './skillUseCases.js?v=37';
import { addItemToInventory } from './inventoryCore.js?v=37';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=37';
import { getCombatBonuses } from './bonuses.js?v=37';
import { itemSpriteFile, monsterSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=37';

// Ícones inline pro log de combate — mesmo padrão gracioso de fallback dos
// outros lugares (sprite real, emoji só se a imagem falhar), construído aqui
// direto na infraestrutura porque a application não pode importar de ui/*.js
// (ver ui/shared.js: itemIconImg/monsterSpriteImg, que fazem a mesma coisa
// pro resto da UI — duplicado de propósito, não uma dependência cruzada).
function itemLogIcon(itemId) {
  const item = ITEMS[itemId];
  return `<img src="${spriteUrl(itemSpriteFile(itemId))}" alt="${item.name}" class="inline-icon"
    onerror="this.outerHTML='<span>${item.icon}</span>'" />`;
}
function monsterLogIcon(monsterId) {
  const m = MONSTERS[monsterId];
  return `<img src="${spriteUrl(monsterSpriteFile(monsterId, m))}" alt="${m.name}" class="inline-icon"
    onerror="this.outerHTML='<span>${m.icon}</span>'" />`;
}

let huntInterval = null;
let regenInterval = null;
// currentMonster é sempre o ALVO da frente (currentPack[0]) — toda a lógica de
// combate mira nele. currentPack é a "sala": o alvo + os monstros esperando,
// mostrados na Battle List. Você luta um por vez; ao matar o da frente, o
// próximo assume; quando a sala esvazia, o próximo tick gera um novo grupo.
let currentMonster = null;
let currentPack = [];
// Tamanho máximo de um grupo numa caçada comum (Boss Rush é sempre 1).
const MAX_PACK_SIZE = 3;
// Modo "só o boss" do Boss Rush (ver application/bossRushUseCases.js): quando
// ligado, spawnMonsterInstance só sorteia zone.boss em vez do elenco normal
// da zona — nunca muda o desenho da caçada comum, só restringe o pool de
// spawn. Fica de fora do save de propósito: é um modo de sessão, não de save
// (o jogador nunca "salva" estando em Boss Rush).
let bossOnly = false;

export function getCurrentMonster() {
  return currentMonster;
}

// A "sala" atual: o alvo + monstros esperando (pra Battle List — ver ui/huntPanel.js).
export function getCurrentPack() {
  return currentPack;
}

export function isBossOnlyHunt() {
  return bossOnly;
}

// Só quem sai explicitamente do Boss Rush (ver bossRushUseCases.js) ou troca
// de zona pelo seletor normal deve chamar isto — startHunt()/stopHunt() por
// si só NÃO mexem na flag, pra pausar/retomar (toggleHunt) durante um Boss
// Rush continuar restrito ao boss em vez de "vazar" pro elenco normal da zona.
export function setBossOnlyMode(v) {
  bossOnly = !!v;
}

export function selectZone(zoneId) {
  bossOnly = false; // escolher uma zona pelo seletor normal sempre sai do Boss Rush
  G.activeZone = zoneId;
  emit(EVENTS.ZONE_PICKER); // atualiza a barra de zona atual + o tema visual
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
  emit(EVENTS.LOG, bossOnly
    ? `<span class="log-info">💀 Boss Rush: desafiando ${monsterLogIcon(zone.boss)} ${zone.name}...</span>`
    : `<span class="log-info">🗺️ Entrando em ${monsterLogIcon(zone.monsters[0])} ${zone.name}...</span>`);
  huntInterval = setInterval(doHuntTick, Math.max(400, 1200 / getSpd()));
}

export function stopHunt() {
  G.hunting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  currentMonster = null;
  currentPack = [];
  emit(EVENTS.HUNT_BUTTON, { hunting: false });
  emit(EVENTS.BATTLE_LIST);
  emit(EVENTS.LOG, '<span class="log-info">⏸ Caçada pausada.</span>');
}

export function doHuntTick() {
  if (!G.hunting || !G.activeZone) return;

  if (!currentMonster) {
    const zone = ZONES[G.activeZone];
    // Boss Rush: restringe o pool de spawn só ao boss da zona, sem tocar em
    // spawnMonsterInstance (a caçada comum continua sorteando o elenco
    // inteiro normalmente) — ver setBossOnlyMode()/bossRushUseCases.js.
    const spawnZone = bossOnly && zone.boss ? { ...zone, monsters: [zone.boss] } : zone;
    // Boss Rush: o boss desafiado de propósito é mais forte que o mesmo bicho
    // encontrado à toa numa zona comum, e escala por tier (ver domain/bestiary.js:
    // bossTierMultiplier) — vencer o tier atual sobe pro próximo, mais forte.
    const bossTier = bossOnly ? (G.bossTiers[G.activeZone] || 1) : 1;
    const bossMult = bossOnly ? bossTierMultiplier(bossTier) : 1;
    // Grupo de 1..MAX_PACK_SIZE numa caçada comum; Boss Rush é sempre 1 boss.
    const packSize = bossOnly ? 1 : 1 + Math.floor(Math.random() * MAX_PACK_SIZE);
    currentPack = Array.from({ length: packSize }, () => spawnMonsterInstance(spawnZone, MONSTERS, G.level, bossMult));
    currentMonster = currentPack[0];
    const extra = packSize > 1 ? ` <span class="log-info">(+${packSize - 1} na sala)</span>` : '';
    emit(EVENTS.LOG, bossOnly
      ? `${monsterLogIcon(currentMonster.defKey)} <span class="log-info">${currentMonster.name} (Tier ${bossTier}) apareceu!</span>`
      : `${monsterLogIcon(currentMonster.defKey)} <span class="log-info">${currentMonster.name} apareceu!</span>${extra}`);
    emit(EVENTS.MONSTER_DISPLAY, { bossAura: bossOnly ? bossAuraClass(bossTier) : null });
    emit(EVENTS.BATTLE_LIST);
    return; // o monstro aparece neste tick; o combate começa no próximo
  }

  const zone = ZONES[G.activeZone];
  const voc = VOC_TRAINING[G.vocation];

  // Player attacks monster
  let playerDmg = calcDamage(getAtk(), currentMonster.def);
  let spellElement = null;
  if (G.rtc.attackType === 'rune' && G.rtc.attackRune && isRuneAvailableToVocation(G.rtc.attackRune, G.vocation) && (G.inventory[G.rtc.attackRune] || 0) > 0) {
    // Ataque automático por runa (RTC): substitui o golpe normal, não treina skill —
    // é um item pré-carregado, não uma habilidade viva do personagem.
    const rune = ITEMS[G.rtc.attackRune];
    playerDmg = rune.dmg;
    G.inventory[G.rtc.attackRune]--;
    if (G.inventory[G.rtc.attackRune] <= 0) delete G.inventory[G.rtc.attackRune];
    emit(EVENTS.LOG, `📜 <span class="log-dmg">[RTC] ${rune.name} usada automaticamente.</span>`);
    emit(EVENTS.INVENTORY);
  } else {
    const atkSpell = G.rtc.attackType === 'spell' && G.rtc.attackSpell && isSpellAvailable(G.rtc.attackSpell, G.vocation, G.level) ? SPELLS[G.rtc.attackSpell] : null;
    if (atkSpell && G.mana >= atkSpell.mana) {
      playerDmg = Math.floor(playerDmg * atkSpell.power);
      G.mana -= atkSpell.mana;
      trainSkill('magic', atkSpell.mana * voc.magicMult);
      emit(EVENTS.LOG, `<span class="log-xp">🗣️ "${atkSpell.words}"</span>`);
      spellElement = atkSpell.element;
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
      spellElement = 'arcane';
    }
  }
  // Bônus de dano de Presa/Charm (ver application/bonuses.js) por cima do golpe.
  const combatBonus = getCombatBonuses(currentMonster.defKey, Date.now());
  if (combatBonus.damage > 1) playerDmg = Math.floor(playerDmg * combatBonus.damage);
  currentMonster.hp -= playerDmg;
  // Lifeleech (charm Vampírico): cura uma fração do dano causado.
  if (combatBonus.lifeleech > 0) {
    const leech = Math.floor(playerDmg * combatBonus.lifeleech);
    if (leech > 0) G.hp = Math.min(getMaxHp(), G.hp + leech);
  }
  emit(EVENTS.LOG, `⚔️ Você causou <span class="log-dmg">${playerDmg}</span> de dano ao ${currentMonster.name}.`);
  emit(EVENTS.PLAYER_BATTLE_SIDE, { attacking: true });
  emit(EVENTS.MONSTER_DISPLAY, { hit: true, spellElement });

  if (currentMonster.hp <= 0) {
    resolveMonsterKill(zone);
    return;
  }

  // Monster attacks player (defender treina Shielding, como no Tibia — só com escudo equipado)
  const monsterDmg = calcDamage(currentMonster.atk, getDef());
  G.hp = Math.max(0, G.hp - monsterDmg);
  if (G.equipment.shield) trainSkill('shielding', 1 * voc.shieldMult);
  emit(EVENTS.LOG, `🩸 ${currentMonster.name} causou <span class="log-dmg">${monsterDmg}</span> de dano em você.`);
  emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true });

  // RTC — Spell Healing: cura automática por magia, sempre ativa (spell configurada
  // na própria aba RTC, ou exura como padrão) ao cruzar o limiar de % de HP definido.
  const hpPct = (G.hp / getMaxHp()) * 100;
  const healSpellId = G.rtc.healSpell || defaultHealSpellId(G.vocation);
  const healSpell = isSpellAvailable(healSpellId, G.vocation, G.level) ? SPELLS[healSpellId] : null;
  if (healSpell && G.hp > 0 && hpPct < G.rtc.healSpellThreshold && G.mana >= healSpell.mana) {
    const heal = Math.floor(getMaxHp() * healSpell.power);
    G.hp = Math.min(getMaxHp(), G.hp + heal);
    G.mana -= healSpell.mana;
    trainSkill('magic', healSpell.mana * voc.magicMult);
    emit(EVENTS.LOG, `💊 <span class="log-heal">[RTC] "${healSpell.words}": +${heal} HP</span> (-${healSpell.mana} mana)`);
    emit(EVENTS.PLAYER_BATTLE_SIDE, { healing: true });
  }

  // RTC — Potion Healing: cura automática por poção do inventário, independente da
  // spell — normalmente um limiar mais baixo, de emergência (ver domain/rtcConfig.js).
  if (G.rtc.healPotion && G.hp > 0 && ((G.hp / getMaxHp()) * 100) < G.rtc.healPotionThreshold && (G.inventory[G.rtc.healPotion] || 0) > 0) {
    const potion = ITEMS[G.rtc.healPotion];
    const before = G.hp;
    G.hp = Math.min(getMaxHp(), G.hp + potion.heal);
    G.inventory[G.rtc.healPotion]--;
    if (G.inventory[G.rtc.healPotion] <= 0) delete G.inventory[G.rtc.healPotion];
    emit(EVENTS.LOG, `${itemLogIcon(G.rtc.healPotion)} <span class="log-heal">[RTC] ${potion.name}: +${G.hp - before} HP</span>`);
    emit(EVENTS.INVENTORY);
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Paga XP/gold/loot pela morte da criatura atual — usado tanto por um golpe normal
// (doHuntTick) quanto por uma runa de ataque usada manualmente (inventoryUseCases),
// para que nenhuma via de dano "sonegue" a recompensa da morte.
export function resolveMonsterKill(zone) {
  const boosts = computeBoostMods(G.boosts, Date.now());
  // Zona Bônus do Dia (como o Boosted Creature/Boss real de Tibia): +50% extra
  // em gold/xp na zona sorteada de hoje — aplicado aqui em cima dos mults da
  // zona/mundo, sem mutar ZONES (dado estático compartilhado por todo mundo).
  const isBoostedToday = G.activeZone === boostedZoneForDate(todayStr());
  const boostedMult = isBoostedToday ? 1.5 : 1;
  // Bônus de Presa/Charm contra esta criatura (ver application/bonuses.js) —
  // multiplicadores de gold/xp e chance aditiva de loot, por cima de tudo.
  const bonus = getCombatBonuses(currentMonster.defKey, Date.now());
  const goldGained = Math.floor((currentMonster.gold[0] + Math.random() * (currentMonster.gold[1] - currentMonster.gold[0])) * zone.goldMult * worldGoldMultiplier(G.currentWorld) * boosts.gold * boostedMult * bonus.gold);
  const xpGained = Math.floor(currentMonster.xp * zone.xpMult * worldXpMultiplier(G.currentWorld) * boosts.xp * boostedMult * bonus.xp);

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills++;

  // Kill counters da zona atual
  G.killCounters = G.killCounters || {};
  G.killCounters[currentMonster.defKey] = (G.killCounters[currentMonster.defKey] || 0) + 1;

  // Battle Pass XP
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  bumpMissionProgress('kills', 1);
  bumpMissionProgress('gold', goldGained);

  emit(EVENTS.LOG, `<span class="log-kill">💀 ${currentMonster.name} morreu!</span> +${xpGained} XP, +${goldGained} <img src="assets/sprites/items/Gold_Coin.webp" class="inline-icon" alt="gold" />`);

  // Loot
  const lootLine = [];
  currentMonster.loot.forEach(([itemId, chance]) => {
    if (Math.random() < chance + boosts.loot + bonus.loot) {
      addItemToInventory(itemId);
      const item = ITEMS[itemId];
      lootLine.push(`${itemLogIcon(itemId)} ${item.name}`);
    }
  });
  if (lootLine.length > 0) emit(EVENTS.LOG, `<span class="log-loot">📦 Loot: ${lootLine.join(', ')}</span>`);

  // Relíquia (raridade) — cai SÓ de boss (ver domain/bestiary.js:
  // BOSS_MONSTER_IDS), com uma chance pequena por cima do loot normal acima.
  // Funciona igual num kill de caçada comum (zona cujo boss aparece no
  // elenco) e num kill de Boss Rush (ver bossRushUseCases.js) — os dois
  // passam por aqui.
  if (BOSS_MONSTER_IDS.has(currentMonster.defKey) && Math.random() < 0.10) {
    const equippablePool = currentMonster.loot
      .map(([id]) => id)
      .filter(id => ITEMS[id] && EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    const pool = equippablePool.length > 0
      ? equippablePool
      : Object.keys(ITEMS).filter(id => EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    if (pool.length > 0) {
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      const rarity = rollRarityTier();
      const tier = RARITY_TIERS[rarity];
      G.relicSeq = (G.relicSeq || 0) + 1;
      G.relics = G.relics || [];
      G.relics.push({ id: 'relic_' + G.relicSeq, itemId, rarity, bonusPct: tier.bonusPct });
      const item = ITEMS[itemId];
      const pct = Math.round(tier.bonusPct * 100);
      emit(EVENTS.LOG, `<span class="log-loot" style="color:${tier.color};font-weight:700">💎 Relíquia ${tier.name}: ${item.name} +${pct}%! (drop de boss)</span>`);
      emit(EVENTS.NOTIFY, { msg: `💎 Relíquia ${tier.name}: ${item.name} +${pct}%!`, type: 'success' });
      emit(EVENTS.INVENTORY);
    }
  }

  gainXp(xpGained);
  const killedId = currentMonster.defKey;
  // anuncia a morte pra quem precisar reagir (ex.: progresso de Linked Tasks)
  // sem a caçada precisar saber que tasks existem
  emit(EVENTS.MONSTER_KILLED, { monsterId: killedId });

  // Boss da zona derrotado pela 1ª vez: desbloqueia a próxima zona da cadeia
  // (ver ZONES[id].requiresBossOf em domain/bestiary.js).
  G.defeatedZoneBosses = G.defeatedZoneBosses || [];
  if (killedId === zone.boss && G.activeZone && !G.defeatedZoneBosses.includes(G.activeZone)) {
    G.defeatedZoneBosses.push(G.activeZone);
    emit(EVENTS.NOTIFY, { msg: '🏆 Boss da zona derrotado! Nova zona desbloqueada.', type: 'success' });
    emit(EVENTS.ZONE_PICKER);
  }

  // Boss Rush: vencer o tier atual desbloqueia o próximo, mais forte e com
  // aura diferente (ver domain/bestiary.js: bossTierMultiplier/bossAuraClass) —
  // é a "escada" de dificuldade infinita do Boss Rush, nunca some/regride.
  if (isBossOnlyHunt() && killedId === zone.boss && G.activeZone) {
    G.bossTiers = G.bossTiers || {};
    const nextTier = (G.bossTiers[G.activeZone] || 1) + 1;
    G.bossTiers[G.activeZone] = nextTier;
    emit(EVENTS.NOTIFY, { msg: `💀 ${currentMonster.name} Tier ${nextTier - 1} derrotado! Tier ${nextTier} desbloqueado.`, type: 'success' });
    emit(EVENTS.BOSS_RUSH_PANEL);
  }

  // Remove o alvo abatido (sempre o da frente) da sala; o próximo da fila vira
  // o novo alvo. Só quando a sala esvazia (currentMonster null) é que o próximo
  // tick gera um novo grupo.
  currentPack.shift();
  currentMonster = currentPack[0] || null;
  emit(EVENTS.MONSTER_DISPLAY, { killed: killedId });
  emit(EVENTS.BATTLE_LIST);
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
