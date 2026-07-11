// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G } from './gameStore.js?v=52';
import { ZONES, boostedZoneForDate, BOSS_MONSTER_IDS, bossTierMultiplier, bossAuraClass } from '../domain/bestiary.js?v=52';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=52';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=52';
import { computeBoostMods } from '../domain/shopCatalog.js?v=52';
import { isRuneAvailableToVocation } from '../domain/rtcConfig.js?v=52';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js?v=52';
import { calcDamage, spawnMonsterInstance } from '../domain/combatFormulas.js?v=52';
import { ITEMS, EQUIPPABLE_TYPES } from '../domain/items.js?v=52';
import { MONSTERS } from '../domain/bestiary.js?v=52';
import { RARITY_TIERS, rollRarityTier } from '../domain/rarity.js?v=52';
import { areaMaxTargets, areaName, isAreaAttack } from '../domain/attackAreas.js?v=52';
import { emit, EVENTS } from '../shared/eventBus.js?v=52';
import { getAtk, getDef, getMaxHp, getMaxMana, getSpd, getEquippedWeaponSkillId } from './stats.js?v=52';
import { trainSkill } from './skillUseCases.js?v=52';
import { addItemToInventory } from './inventoryCore.js?v=52';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=52';
import { getCombatBonuses } from './bonuses.js?v=52';
import { getXpRate, getGoldRate, getLootRate, getRelicDropChance, getRarityWeights, getSpawnDelayRange } from './adminUseCases.js?v=52';
import { itemSpriteFile, monsterSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=52';

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
// Tamanho máximo de um grupo numa caçada comum (Boss Rush é sempre 1). Grupos
// maiores fazem os ataques de ÁREA valerem a pena (limpam a sala num golpe),
// enquanto o alvo único precisa abater um por um. Só o bicho da frente revida,
// então uma sala cheia é mais XP disponível, não mais perigo simultâneo.
const MAX_PACK_SIZE = 5;
// Instante em que o próximo grupo pode aparecer — enquanto não chega, o
// personagem fica "procurando" (andando pra baixo, ver ui/huntPanel.js:
// updateSceneMode). Dá um respiro de exploração entre salas em vez de o
// próximo bicho surgir instantâneo.
let nextSpawnAt = 0;
function searchDelay() {
  // Range configurável no Painel Admin (G.adminConfig.spawnDelayMin/Max, em s).
  const { min, max } = getSpawnDelayRange();
  return min + Math.random() * Math.max(0, max - min);
}
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
  nextSpawnAt = Date.now() + searchDelay(); // começa procurando (boneco anda)
  emit(EVENTS.HUNT_BUTTON, { hunting: true });
  emit(EVENTS.MONSTER_DISPLAY, {}); // limpa o alvo e liga o modo "procurando"
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
    // Ainda "procurando": segura o próximo grupo até passar o tempo de busca
    // (o boneco fica andando pra baixo nesse meio tempo — ver ui/huntPanel.js).
    if (Date.now() < nextSpawnAt) return;
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

  // O alvo da frente (sempre currentPack[0]). Guardado antes de resolver mortes
  // porque um ataque de área pode abater ele E outros no mesmo tick.
  const primary = currentMonster;

  // Player attacks monster. `areaId` decide a FORMA de área (ver
  // domain/attackAreas.js): quando não é 'single', o mesmo golpe respinga nas
  // criaturas que estão esperando atrás na sala (até o limite da forma).
  // `spellPower`/`runeDmg` guardam COMO recalcular o dano em cada alvo do
  // respingo — cada criatura leva seu próprio dano (rola contra a def dela).
  let playerDmg = calcDamage(getAtk(), primary.def);
  let spellElement = null;
  let areaId = 'single';
  let spellPower = null;
  let runeDmg = null;
  if (G.rtc.attackType === 'rune' && G.rtc.attackRune && isRuneAvailableToVocation(G.rtc.attackRune, G.vocation) && (G.inventory[G.rtc.attackRune] || 0) > 0) {
    // Ataque automático por runa (RTC): substitui o golpe normal, não treina skill —
    // é um item pré-carregado, não uma habilidade viva do personagem.
    const rune = ITEMS[G.rtc.attackRune];
    playerDmg = rune.dmg;
    runeDmg = rune.dmg;
    areaId = rune.area || 'single';
    G.inventory[G.rtc.attackRune]--;
    if (G.inventory[G.rtc.attackRune] <= 0) delete G.inventory[G.rtc.attackRune];
    emit(EVENTS.LOG, { html: `📜 <span class="log-dmg">[RTC] ${rune.name} usada automaticamente.</span>`, cat: 'suprimento' });
    emit(EVENTS.INVENTORY);
  } else {
    const atkSpell = G.rtc.attackType === 'spell' && G.rtc.attackSpell && isSpellAvailable(G.rtc.attackSpell, G.vocation, G.level) ? SPELLS[G.rtc.attackSpell] : null;
    if (atkSpell && G.mana >= atkSpell.mana) {
      playerDmg = Math.floor(playerDmg * atkSpell.power);
      spellPower = atkSpell.power;
      areaId = atkSpell.area || 'single';
      G.mana -= atkSpell.mana;
      trainSkill('magic', atkSpell.mana * voc.magicMult);
      emit(EVENTS.LOG, { html: `<span class="log-xp">🗣️ "${atkSpell.words}"</span>`, cat: 'magia' });
      spellElement = atkSpell.element;
    }
    if (voc.attackSkill !== 'magic') {
      // treino da skill de arma por golpe — a arma REALMENTE equipada decide qual skill
      // sobe (sword só treina com espada equipada, axe só com machado, etc.)
      trainSkill(getEquippedWeaponSkillId(), 1 * voc.weaponMult);
    } else if (!atkSpell && G.mana >= 8) {
      // mage sem spell selecionada: golpe arcano básico (alvo único)
      playerDmg = Math.floor(playerDmg * 1.3);
      G.mana -= 8;
      trainSkill('magic', 8 * voc.magicMult);
      spellElement = 'arcane';
    }
  }

  // Aplica dano num alvo com o bônus de Presa/Charm DELE e o lifeleech; devolve
  // o dano final. Usado no alvo da frente e em cada alvo do respingo de área.
  function strike(target, rawDmg) {
    const cb = getCombatBonuses(target.defKey, Date.now());
    let dmg = Math.max(1, Math.floor(rawDmg * (cb.damage > 1 ? cb.damage : 1)));
    target.hp -= dmg;
    if (cb.lifeleech > 0) {
      const leech = Math.floor(dmg * cb.lifeleech);
      if (leech > 0) G.hp = Math.min(getMaxHp(), G.hp + leech);
    }
    return dmg;
  }

  // Golpe no alvo da frente.
  const primaryDmg = strike(primary, playerDmg);
  emit(EVENTS.LOG, `⚔️ Você causou <span class="log-dmg">${primaryDmg}</span> de dano ao ${primary.name}.`);

  // Respingo de área: mesmo golpe nas criaturas esperando atrás, cada uma com
  // seu próprio dano (recalculado contra a def dela). Limitado pela forma da
  // área E pela quantidade de bichos realmente presentes na sala.
  if (isAreaAttack(areaId) && currentPack.length > 1) {
    const maxTargets = areaMaxTargets(areaId);
    const splashTargets = currentPack.slice(1, maxTargets); // exclui o da frente
    splashTargets.forEach(t => {
      const raw = runeDmg != null ? runeDmg : Math.floor(calcDamage(getAtk(), t.def) * (spellPower || 1));
      const d = strike(t, raw);
      emit(EVENTS.LOG, `💥 <span class="log-dmg">${d}</span> em ${t.name} <span class="log-info">(área)</span>.`);
    });
    if (splashTargets.length > 0) {
      emit(EVENTS.LOG, { html: `<span class="log-info">🎯 ${areaName(areaId)}: atingiu ${splashTargets.length + 1} criaturas.</span>`, cat: 'combate' });
    }
  }

  emit(EVENTS.PLAYER_BATTLE_SIDE, { attacking: true });
  emit(EVENTS.MONSTER_DISPLAY, { hit: true, spellElement });

  // Resolve TODAS as criaturas que morreram neste golpe (o da frente e/ou as
  // atingidas pela área). Snapshot antes, porque resolveMonsterKill remove da
  // sala e reaponta currentMonster.
  const primaryDied = primary.hp <= 0;
  const deaths = currentPack.filter(m => m.hp <= 0);
  deaths.forEach(m => resolveMonsterKill(zone, m));

  // Se o alvo da frente caiu (ou a sala esvaziou), o tick acaba aqui — corpo
  // não revida. O próximo tick já mira o novo alvo (ou volta a procurar).
  if (primaryDied || !currentMonster) {
    emit(EVENTS.BARS);
    emit(EVENTS.HEADER_STATS);
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
    emit(EVENTS.LOG, { html: `💊 <span class="log-heal">[RTC] "${healSpell.words}": +${heal} HP</span> (-${healSpell.mana} mana)`, cat: 'magia' });
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
    emit(EVENTS.LOG, { html: `${itemLogIcon(G.rtc.healPotion)} <span class="log-heal">[RTC] ${potion.name}: +${G.hp - before} HP</span>`, cat: 'suprimento' });
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
export function resolveMonsterKill(zone, victim) {
  // `victim` é a criatura que morreu. Normalmente é o alvo da frente, mas num
  // ataque de ÁREA pode ser uma que estava esperando atrás na sala (ver
  // doHuntTick). Default: o alvo da frente — mantém compatível com quem chama
  // sem passar vítima (runa manual em inventoryUseCases e golpe de alvo único).
  const mon = victim || currentMonster;
  if (!mon) return;
  const boosts = computeBoostMods(G.boosts, Date.now());
  // Zona Bônus do Dia (como o Boosted Creature/Boss real de Tibia): +50% extra
  // em gold/xp na zona sorteada de hoje — aplicado aqui em cima dos mults da
  // zona/mundo, sem mutar ZONES (dado estático compartilhado por todo mundo).
  const isBoostedToday = G.activeZone === boostedZoneForDate(todayStr());
  const boostedMult = isBoostedToday ? 1.5 : 1;
  // Bônus de Presa/Charm contra esta criatura (ver application/bonuses.js) —
  // multiplicadores de gold/xp e chance aditiva de loot, por cima de tudo.
  const bonus = getCombatBonuses(mon.defKey, Date.now());
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zone.goldMult * worldGoldMultiplier(G.currentWorld) * boosts.gold * boostedMult * bonus.gold * getGoldRate());
  const xpGained = Math.floor(mon.xp * zone.xpMult * worldXpMultiplier(G.currentWorld) * boosts.xp * boostedMult * bonus.xp * getXpRate());

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills++;

  // Kill counters da zona atual
  G.killCounters = G.killCounters || {};
  G.killCounters[mon.defKey] = (G.killCounters[mon.defKey] || 0) + 1;

  // Battle Pass XP
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  bumpMissionProgress('kills', 1);
  bumpMissionProgress('gold', goldGained);

  emit(EVENTS.LOG, `<span class="log-kill">💀 ${mon.name} morreu!</span> +${xpGained} XP, +${goldGained} <img src="assets/sprites/items/Gold_Coin.webp" class="inline-icon" alt="gold" />`);

  // Loot
  const lootLine = [];
  mon.loot.forEach(([itemId, chance]) => {
    if (Math.random() < (chance + boosts.loot + bonus.loot) * getLootRate()) {
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
  if (BOSS_MONSTER_IDS.has(mon.defKey) && Math.random() < getRelicDropChance()) {
    const equippablePool = mon.loot
      .map(([id]) => id)
      .filter(id => ITEMS[id] && EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    const pool = equippablePool.length > 0
      ? equippablePool
      : Object.keys(ITEMS).filter(id => EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    if (pool.length > 0) {
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      const rarity = rollRarityTier(getRarityWeights());
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
  const killedId = mon.defKey;
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
    emit(EVENTS.NOTIFY, { msg: `💀 ${mon.name} Tier ${nextTier - 1} derrotado! Tier ${nextTier} desbloqueado.`, type: 'success' });
    emit(EVENTS.BOSS_RUSH_PANEL);
  }

  // Remove a vítima da sala (por identidade — num ataque de área ela pode não
  // ser a da frente). O alvo passa a ser sempre o primeiro sobrevivente. Só
  // quando a sala esvazia (currentMonster null) o próximo tick gera novo grupo.
  const idx = currentPack.indexOf(mon);
  if (idx >= 0) currentPack.splice(idx, 1);
  currentMonster = currentPack[0] || null;
  // sala limpa: volta a "procurar" (boneco anda de novo por um tempinho)
  if (!currentMonster) nextSpawnAt = Date.now() + searchDelay();
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
