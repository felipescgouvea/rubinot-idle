// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G } from './gameStore.js?v=126';
import { ZONES, boostedZoneForDate, BOSS_MONSTER_IDS, bossTierMultiplier, bossAuraClass } from '../domain/bestiary.js?v=133';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=126';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=126';
import { computeBoostMods } from '../domain/shopCatalog.js?v=126';
import { isRuneAvailableToVocation, canUseAttackRune, normalizeAttackSpells } from '../domain/rtcConfig.js?v=127';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js?v=126';
import { calcDamage, spawnMonsterInstance, spellAttackDamage, spellHealAmount, runeDamage, potionRestore, monsterAttack } from '../domain/combatFormulas.js?v=126';
import { elementMod } from '../domain/elements.js?v=125';
import { STAMINA_MAX, staminaXpMult } from '../domain/stamina.js?v=125';
import { deathXpLossPct, reviveHpPct } from '../domain/blessings.js?v=125';
import { ITEMS, EQUIPPABLE_TYPES, canUsePotion, resolveEquippedItem, equippableFallbackPool } from '../domain/items.js?v=135';
import { MONSTERS } from '../domain/bestiary.js?v=133';
import { RARITY_TIERS, rollIndependentRarityTiers } from '../domain/rarity.js?v=126';
import { areaMaxTargets, areaName, isAreaAttack } from '../domain/attackAreas.js?v=125';
import { spellEffectName, runeEffectName, basicAttackMissile } from '../domain/combatFx.js?v=125';
import { emit, EVENTS } from '../shared/eventBus.js?v=125';
import { getAtk, getDef, getMagic, getMaxHp, getMaxMana, getSpd, getEquippedWeaponSkillId } from './stats.js?v=125';
import { trainSkill } from './skillUseCases.js?v=126';
import { addItemToInventory } from './inventoryCore.js?v=126';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=125';
import { getCombatBonuses } from './bonuses.js?v=125';
import { getXpRate, getGoldRate, getLootRate, getRelicDropChance, getRarityWeights, getSpawnDelayRange, getZoneMultiplier, isStaminaEnabled, isConsumeAmmo, getZoneSpawn, getMonsterLoot } from './adminUseCases.js?v=128';
import { itemSpriteFile, monsterSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=127';
import { t } from '../i18n/i18n.js?v=135';

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

// Rótulo (chave i18n) do elemento da magia do monstro, pro log de combate.
const MONSTER_ELEMENT_KEYS = { fire: 'log.elementFire', energy: 'log.elementEnergy', ice: 'log.elementIce', earth: 'log.elementEarth', death: 'log.elementDeath', holy: 'log.elementHoly', physical: 'log.elementPhysical' };

let huntInterval = null;
let regenInterval = null;
let rtcHealInterval = null;
// currentMonster é sempre o ALVO da frente (currentPack[0]) — toda a lógica de
// combate mira nele. currentPack é a "sala": o alvo + os monstros esperando,
// mostrados na Battle List. Você luta um por vez; ao matar o da frente, o
// próximo assume; quando a sala esvazia, o próximo tick gera um novo grupo.
let currentMonster = null;
let currentPack = [];
// id sequencial por instância spawnada — o palco usa isso pra materializar cada
// monstro novo (mesmo que seja do mesmo tipo do anterior). Ver ui/huntPanel.js.
let spawnSeq = 0;
// Monstros mortos há menos de 1s: continuam aparecendo na Battle List com a
// vida ZERADA (indicando a morte) por 1 segundo antes de sumir (ver
// resolveMonsterKill + ui/huntPanel.js: renderBattleList).
let recentDead = [];
let deadSeq = 0;
export function getRecentDead() { return recentDead; }
// Cooldown de magias (fiel ao Tibia — ver domain/spells.js: cd em segundos).
// Guarda o instante (epoch ms) em que cada magia volta a ficar pronta. Enquanto
// está em cooldown, o RTC não recasta — o personagem faz o golpe básico. É
// estado efêmero de sessão (baseado em tempo real), fora do save.
const spellCdUntil = {};
// Cooldown de GRUPO das magias de ataque (fiel ao Tibia: toda magia de ataque
// pertence ao grupo "Attack", com recarga de grupo de 2s COMPARTILHADA entre
// TODAS elas — além do cooldown individual de cada uma). É o que impede o RTC
// de alternar entre duas magias de ataque prontas (ex.: Berserk cd 4s e
// Whirlwind Throw cd 6s, ambas configuradas por prioridade) mais rápido que
// 2s, mesmo que os cooldowns individuais permitam.
const ATTACK_GROUP_CD_MS = 2000;
let attackGroupCdUntil = 0;
// Exhaust de poção (~1s, como no Tibia) — cura e mana COMPARTILHAM o cooldown,
// então o RTC não bebe poção todo tick, só a cada segundo. Estado de sessão.
const POTION_CD_MS = 1000;
let potionCdUntil = 0;
function isSpellReady(id) { return (spellCdUntil[id] || 0) <= Date.now(); }
function startSpellCd(id, seconds) { if (seconds > 0) spellCdUntil[id] = Date.now() + seconds * 1000; }
export function getSpellCooldownRemaining(id) { return Math.max(0, (spellCdUntil[id] || 0) - Date.now()); }
function isAttackGroupReady() { return attackGroupCdUntil <= Date.now(); }
function startAttackGroupCd() { attackGroupCdUntil = Date.now() + ATTACK_GROUP_CD_MS; }
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

// Hunt Analyzer (como o Analisador de Caçada do Tibia): estatísticas da SESSÃO
// atual de caçada — zeradas ao iniciar uma caçada. Só de sessão (não vai pro
// save). XP/gold por hora são derivados do tempo decorrido em getHuntStats().
function newHuntSession() {
  return { start: Date.now(), kills: 0, xp: 0, gold: 0, loot: 0, supplies: 0 };
}
let huntSession = newHuntSession();
export function getHuntStats() {
  const s = huntSession;
  const elapsedMs = Math.max(1000, Date.now() - s.start);
  const perHour = (v) => Math.round(v / (elapsedMs / 3600000));
  const profit = s.gold + s.loot - s.supplies;
  return {
    hunting: G.hunting, elapsedMs, kills: s.kills,
    xp: s.xp, xpH: perHour(s.xp),
    gold: s.gold, goldH: perHour(s.gold),
    loot: s.loot, supplies: s.supplies,
    profit, profitH: perHour(profit),
  };
}

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
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: t('hunt.needVocation'), type: 'error' }); return; }
  if (!G.activeZone) { emit(EVENTS.NOTIFY, { msg: t('hunt.needZone'), type: 'error' }); return; }
  const zone = ZONES[G.activeZone];
  // Sem restrição de nível pra caçar — as criaturas escalam com o nível do
  // jogador; entrar numa zona forte cedo é escolha (e risco) do jogador.
  G.hunting = true;
  huntSession = newHuntSession(); // zera o Hunt Analyzer a cada nova caçada
  nextSpawnAt = Date.now() + searchDelay(); // começa procurando (boneco anda)
  emit(EVENTS.HUNT_BUTTON, { hunting: true });
  emit(EVENTS.HUNT_STATS);
  emit(EVENTS.MONSTER_DISPLAY, {}); // limpa o alvo e liga o modo "procurando"
  emit(EVENTS.LOG, bossOnly
    ? t('hunt.logBossRushChallenge', { icon: monsterLogIcon(zone.boss), zone: t(zone.name) })
    : t('hunt.logEnterZone', { icon: monsterLogIcon(zone.monsters[0]), zone: t(zone.name) }));
  // Cooldown do golpe básico (o tick inteiro: golpe + magia/runa + poções, ver
  // doHuntTick abaixo) — 2s de base (Knight, spd 1.2), escalando pela mesma
  // velocidade que já modula o resto do jogo. Era 1s (1200/spd); dobrado pra
  // 2s de propósito, mais fiel ao ritmo de ataque do Tibia real.
  huntInterval = setInterval(doHuntTick, Math.max(400, 2400 / getSpd()));
}

export function stopHunt() {
  G.hunting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  currentMonster = null;
  currentPack = [];
  recentDead = [];
  emit(EVENTS.HUNT_BUTTON, { hunting: false });
  emit(EVENTS.BATTLE_LIST);
  emit(EVENTS.LOG, t('hunt.logPaused'));
}

// RTC — cura por spell/poção de vida/poção de mana. Chamada tanto no tick de
// combate (doHuntTick, todo tick) quanto no regen passivo (startRegen, a cada
// 2s) — assim a cura fica ativa parado, procurando ou fora de caçada, e o
// jogador não entra na próxima batalha sem vida por ela só rodar em combate.
// `trackSupplies` só soma o custo da poção ao Hunt Analyzer da sessão atual
// (não faz sentido registrar gasto de "caçada" enquanto não se está caçando).
function applyRtcHealing(trackSupplies) {
  const healSpellId = G.rtc.healSpell || defaultHealSpellId(G.vocation);
  const healSpell = isSpellAvailable(healSpellId, G.vocation, G.level) ? SPELLS[healSpellId] : null;
  const hpPct = (G.hp / getMaxHp()) * 100;
  if (healSpell && G.hp > 0 && hpPct < G.rtc.healSpellThreshold && G.mana >= healSpell.mana && isSpellReady(healSpellId)) {
    const heal = Math.min(getMaxHp() - G.hp, spellHealAmount({ spell: healSpell, level: G.level, magicLevel: getMagic() }));
    G.hp = Math.min(getMaxHp(), G.hp + heal);
    G.mana -= healSpell.mana;
    startSpellCd(healSpellId, healSpell.cd);
    trainSkill('magic', healSpell.mana);
    emit(EVENTS.LOG, { html: t('log.rtcHealSpell', { words: healSpell.words, heal, mana: healSpell.mana }), cat: 'magia' });
    emit(EVENTS.PLAYER_BATTLE_SIDE, { healing: true });
  }

  // Poção de vida: independente da spell, normalmente limiar mais baixo, de
  // emergência (ver domain/rtcConfig.js). Compartilha o exhaust (~1s) com a
  // poção de mana abaixo — o RTC não bebe as duas no mesmo tick.
  const potionReady = Date.now() >= potionCdUntil;
  if (potionReady && G.rtc.healPotion && G.hp > 0 && ((G.hp / getMaxHp()) * 100) < G.rtc.healPotionThreshold && (G.inventory[G.rtc.healPotion] || 0) > 0 && canUsePotion(ITEMS[G.rtc.healPotion], G.vocation, G.level)) {
    const potion = ITEMS[G.rtc.healPotion];
    const before = G.hp;
    G.hp = Math.min(getMaxHp(), G.hp + potionRestore(potion.heal)); // faixa ±15%
    potionCdUntil = Date.now() + POTION_CD_MS;
    G.inventory[G.rtc.healPotion]--;
    if (trackSupplies) huntSession.supplies += potion.sell || 0;
    if (G.inventory[G.rtc.healPotion] <= 0) delete G.inventory[G.rtc.healPotion];
    emit(EVENTS.LOG, { html: t('log.rtcHealPotion', { icon: itemLogIcon(G.rtc.healPotion), name: potion.name, amount: G.hp - before }), cat: 'suprimento' });
    emit(EVENTS.INVENTORY);
  }

  // Poção de mana: repõe mana automaticamente quando cai abaixo do limiar, pra
  // o mage/paladin não ficar sem mana pra castar (ver rtcConfig.js). Mesmo
  // exhaust de poção acima, compartilhado entre as duas.
  if (Date.now() >= potionCdUntil && G.rtc.manaPotion && G.mana < getMaxMana() && ((G.mana / getMaxMana()) * 100) < G.rtc.manaPotionThreshold && (G.inventory[G.rtc.manaPotion] || 0) > 0 && canUsePotion(ITEMS[G.rtc.manaPotion], G.vocation, G.level)) {
    const potion = ITEMS[G.rtc.manaPotion];
    const before = G.mana;
    G.mana = Math.min(getMaxMana(), G.mana + potionRestore(potion.mana)); // faixa ±15%
    potionCdUntil = Date.now() + POTION_CD_MS;
    G.inventory[G.rtc.manaPotion]--;
    if (trackSupplies) huntSession.supplies += potion.sell || 0;
    if (G.inventory[G.rtc.manaPotion] <= 0) delete G.inventory[G.rtc.manaPotion];
    emit(EVENTS.LOG, { html: t('log.rtcManaPotion', { icon: itemLogIcon(G.rtc.manaPotion), name: potion.name, amount: G.mana - before }), cat: 'suprimento' });
    emit(EVENTS.INVENTORY);
  }
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
    // Peso por monstro e faixa do grupo vêm do Painel Admin (por zona). No Boss
    // Rush, ignora: é sempre 1 boss. Ver domain/adminConfig.js: resolveZoneSpawn.
    const spawnCfg = bossOnly ? null : getZoneSpawn(G.activeZone, zone.monsters);
    const packSize = bossOnly ? 1 : (spawnCfg.packMin + Math.floor(Math.random() * (spawnCfg.packMax - spawnCfg.packMin + 1)));
    currentPack = Array.from({ length: packSize }, () => { const m = spawnMonsterInstance(spawnZone, MONSTERS, G.level, bossMult, spawnCfg && spawnCfg.weights); m.uid = ++spawnSeq; return m; });
    currentMonster = currentPack[0];
    const extra = packSize > 1 ? t('hunt.logExtraInRoom', { count: packSize - 1 }) : '';
    emit(EVENTS.LOG, bossOnly
      ? t('hunt.logBossTierAppeared', { icon: monsterLogIcon(currentMonster.defKey), name: currentMonster.name, tier: bossTier })
      : t('hunt.logMonsterAppeared', { icon: monsterLogIcon(currentMonster.defKey), name: currentMonster.name }) + extra);
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
  // Aplica dano num alvo com o bônus de Presa/Charm DELE e o lifeleech; devolve
  // o dano final. Usado no golpe básico, na magia/runa e em cada alvo do respingo.
  function strike(target, rawDmg) {
    const cb = getCombatBonuses(target.defKey, Date.now());
    let dmg = Math.max(1, Math.floor(rawDmg * (cb.damage > 1 ? cb.damage : 1)));
    target.hp -= dmg;
    target._hitAt = Date.now(); // marca o instante do golpe (flash na Battle List, inclui área)
    if (cb.lifeleech > 0) {
      const leech = Math.floor(dmg * cb.lifeleech);
      if (leech > 0) G.hp = Math.min(getMaxHp(), G.hp + leech);
    }
    return dmg;
  }

  // === Ações ofensivas do tick — FIÉIS ao Tibia: o auto-ataque (arma) e a
  // magia/runa são SEPARADOS e acontecem no MESMO tick (você bate com a arma E
  // casta ao mesmo tempo). As poções (cura/mana) também rodam neste mesmo tick,
  // mais abaixo. Então um tick = 1 golpe básico + 1 magia/runa + poções. ===

  // (1) GOLPE BÁSICO — sempre acontece: arma pro guerreiro/paladino (treina a
  // skill da arma equipada); o cajado/wand do mago é arma mágica e NÃO custa mana.
  // Consumo de munição (opcional, Admin): o paladino gasta 1 flecha/dardo por
  // golpe à distância; sem munição, só soca fraco. Dano físico → aplica o
  // modificador físico do alvo (a maioria é neutra).
  let basicRaw, outOfAmmo = false;
  if (voc.attackSkill === 'distance' && isConsumeAmmo()) {
    const ammoId = G.equipment.ammo;
    if (ammoId && (G.inventory[ammoId] || 0) > 0) {
      G.inventory[ammoId]--;
      huntSession.supplies += (ITEMS[ammoId] && ITEMS[ammoId].sell) || 0;
      if (G.inventory[ammoId] <= 0) { delete G.inventory[ammoId]; emit(EVENTS.NOTIFY, { msg: t('hunt.notifyOutOfAmmo'), type: 'error' }); }
      emit(EVENTS.INVENTORY);
      basicRaw = calcDamage(getAtk(), primary.def);
    } else {
      outOfAmmo = true;
      basicRaw = calcDamage(7 + G.sk.fist.lv, primary.def) * 0.5; // sem munição: soco fraco
    }
  } else {
    basicRaw = calcDamage(getAtk(), primary.def);
    // Calibragem: o auto-ataque de wand/rod do mago é um POKE fraco (como no
    // Tibia) — o dano do mago vem das magias, não do cajado gratuito. Sem esse
    // corte, o wand grátis todo tick inflava demais o DPS do mago.
    if (voc.attackSkill === 'magic') basicRaw *= 0.5;
  }
  const basicDmg = basicRaw * elementMod(primary.defKey, 'physical');
  // Fiel ao Tibia: golpe corpo-a-corpo/soco treina +1 tentativa; Distance treina
  // +2 (dobro, ver domain/character.js: SKILL_MULTIPLIERS/triesForNext) — o
  // multiplicador que difere POR VOCAÇÃO já mora no denominador (tentativas
  // necessárias), não aqui no ganho por golpe.
  if (voc.attackSkill !== 'magic') {
    const meleeSkillId = getEquippedWeaponSkillId();
    trainSkill(meleeSkillId, meleeSkillId === 'distance' ? 2 : 1);
  }
  const basicHit = strike(primary, basicDmg);
  const basicLabel = outOfAmmo ? t('hunt.logOutOfAmmoPunch') : t('hunt.logBasicHit');
  emit(EVENTS.LOG, t('log.basicAttack', { label: basicLabel, dmg: basicHit, name: primary.name }));

  // Projétil do golpe básico à distância/mágico: a flecha/virote do arco ou o
  // raio elemental da wand/rod voando do boneco até o alvo (ver ui/huntPanel.js).
  // Corpo-a-corpo não dispara; sem munição (soco) também não.
  if (!outOfAmmo) {
    const missile = basicAttackMissile({ attackSkill: voc.attackSkill, weaponId: G.equipment.weapon, ammoId: G.equipment.ammo });
    if (missile) emit(EVENTS.COMBAT_PROJECTILE, { missile, targetUid: String(primary.uid || primary.defKey) });
  }

  // (2) MAGIA (por prioridade) OU RUNA — ação ADICIONAL no mesmo tick, com dano,
  // área e efeito próprios. Magia custa mana + cooldown; runa consome o item. O
  // dano de cada alvo é calculado por `hitFn(target)` e multiplicado pela
  // resistência/fraqueza elemental DELE (ver domain/elements.js).
  const magic = getMagic();
  let combatFx = null;
  let areaId = 'single';
  let element = null;
  let hitFn = null; // (target) => dano-base (antes do modificador elemental)
  // Calculado aqui (não só lá embaixo, no bloco de cura) porque a magia de
  // ataque precisa RESERVAR essa mana antes de gastar — sem isso, uma magia
  // cara (ex.: Groundshaker do knight, 160 de mana, contra um manaRegen de
  // só 1/tick) esvazia a mana e o RTC fica sem como curar depois no MESMO
  // tick em que o monstro contra-ataca. Golpe físico nunca compete com isso
  // (não usa mana); só a magia/runa de ataque respeita essa reserva.
  const healSpellIdForReserve = G.rtc.healSpell || defaultHealSpellId(G.vocation);
  const healSpellForReserve = isSpellAvailable(healSpellIdForReserve, G.vocation, G.level) ? SPELLS[healSpellIdForReserve] : null;
  const healManaReserve = healSpellForReserve ? healSpellForReserve.mana : 0;
  if (G.rtc.attackType === 'rune' && G.rtc.attackRune && canUseAttackRune(G.rtc.attackRune, G.vocation, magic) && (G.inventory[G.rtc.attackRune] || 0) > 0) {
    const rune = ITEMS[G.rtc.attackRune];
    areaId = rune.area || 'single';
    element = rune.element || 'physical';
    hitFn = () => runeDamage({ rune, level: G.level, magicLevel: magic }); // fórmula do Tibia (nível/5 + ML·a + base)
    combatFx = { effect: runeEffectName(G.rtc.attackRune), shape: areaId };
    G.inventory[G.rtc.attackRune]--;
    huntSession.supplies += rune.sell || 0;
    if (G.inventory[G.rtc.attackRune] <= 0) {
      delete G.inventory[G.rtc.attackRune];
      // Sem isso o RTC volta a bater só o golpe básico e o jogador não entende
      // por que o dano caiu — mesmo aviso já dado pra munição (ver acima).
      emit(EVENTS.NOTIFY, { msg: t('hunt.notifyOutOfRunes', { name: rune.name }), type: 'error' });
    }
    emit(EVENTS.LOG, { html: t('log.rtcRuneUsed', { name: rune.name }), cat: 'suprimento' });
    emit(EVENTS.INVENTORY);
  } else {
    // Magias PRONTAS agora (nível/voc ok, com mana sobrando MESMO reservando
    // o custo da cura, e fora de cooldown), na ordem de prioridade.
    const ready = isAttackGroupReady()
      ? normalizeAttackSpells(G.rtc)
        .map(id => ({ id, s: SPELLS[id] }))
        .filter(({ id, s }) => s && isSpellAvailable(id, G.vocation, G.level) && G.mana - healManaReserve >= s.mana && isSpellReady(id))
      : [];
    let atkSpellId = null, atkSpell = null;
    if (ready.length) {
      let pick = ready[0]; // padrão: a primeira da prioridade
      if (G.rtc.smartElement) {
        // Prioridade inteligente: entre as prontas, a mais forte contra a
        // fraqueza da criatura da frente (maior modificador elemental).
        pick = ready.reduce((best, cur) =>
          elementMod(primary.defKey, cur.s.element) > elementMod(primary.defKey, best.s.element) ? cur : best, ready[0]);
      }
      atkSpellId = pick.id; atkSpell = pick.s;
    }
    if (atkSpell) {
      areaId = atkSpell.area || 'single';
      element = atkSpell.element;
      // Contexto pra escala das magias FÍSICAS (fórmula do Tibia): melee usa
      // skill·ataque da arma; distância usa a skill de distância. As demais só
      // usam Magic Level. (Ver domain/combatFormulas.js: spellAttackDamage.)
      const meleeSkillId = getEquippedWeaponSkillId();
      const meleeSkill = (G.sk[meleeSkillId] && G.sk[meleeSkillId].lv) || 0;
      const eqWeapon = resolveEquippedItem(G.equipment.weapon, G.relics);
      const weaponAtk = (eqWeapon && eqWeapon.atk) || 7; // punho = ataque base 7
      const distanceSkill = (G.sk.distance && G.sk.distance.lv) || 0;
      hitFn = () => spellAttackDamage({ spell: atkSpell, level: G.level, magicLevel: magic, meleeSkill, weaponAtk, distanceSkill });
      G.mana -= atkSpell.mana;
      startSpellCd(atkSpellId, atkSpell.cd);
      startAttackGroupCd();
      trainSkill('magic', atkSpell.mana);
      emit(EVENTS.LOG, { html: t('log.spellCast', { words: atkSpell.words }), cat: 'magia' });
      combatFx = { effect: spellEffectName(atkSpellId, atkSpell.element), shape: areaId };
    }
  }

  // Aplica a magia/runa: dano no alvo da frente (se sobreviveu ao básico) + o
  // respingo de área nas criaturas atrás — cada alvo com SEU modificador elemental.
  if (hitFn) {
    if (primary.hp > 0) {
      const sHit = strike(primary, hitFn(primary) * elementMod(primary.defKey, element));
      emit(EVENTS.LOG, t('log.spellDamage', { dmg: sHit, name: primary.name }));
    }
    if (isAreaAttack(areaId) && currentPack.length > 1) {
      const maxTargets = areaMaxTargets(areaId);
      const splashTargets = currentPack.slice(1, maxTargets); // exclui o da frente
      splashTargets.forEach(tgt => {
        const d = strike(tgt, hitFn(tgt) * elementMod(tgt.defKey, element));
        emit(EVENTS.LOG, t('log.splashDamage', { dmg: d, name: tgt.name }));
      });
      if (splashTargets.length > 0) {
        emit(EVENTS.LOG, { html: t('log.areaHitCount', { area: areaName(areaId, t), count: splashTargets.length + 1 }), cat: 'combate' });
      }
    }
  }

  emit(EVENTS.PLAYER_BATTLE_SIDE, { attacking: true });
  emit(EVENTS.MONSTER_DISPLAY, { hit: true });
  // Efeito real da magia/runa espalhado nos tiles ao redor do boneco (null no
  // golpe básico → nada é desenhado).
  if (combatFx) emit(EVENTS.COMBAT_FX, combatFx);

  // Resolve TODAS as criaturas que morreram neste golpe (o da frente e/ou as
  // atingidas pela área). Snapshot antes, porque resolveMonsterKill remove da
  // sala e reaponta currentMonster.
  const primaryDied = primary.hp <= 0;
  const deaths = currentPack.filter(m => m.hp <= 0);
  deaths.forEach(m => resolveMonsterKill(zone, m));

  // Boss Rush: cada tier vencido PAUSA a caçada — o jogador precisa clicar
  // explicitamente pra desafiar o próximo tier (não sobe automático). Como no
  // Boss Rush a sala é sempre 1 boss, qualquer morte aqui = tier vencido.
  if (bossOnly && deaths.length > 0) {
    emit(EVENTS.BARS);
    emit(EVENTS.HEADER_STATS);
    stopHunt(); // pausa; o card/botão passa a mostrar "Batalhar Tier X"
    return;
  }

  // Se o alvo da frente caiu (ou a sala esvaziou), o tick acaba aqui — corpo
  // não revida. O próximo tick já mira o novo alvo (ou volta a procurar).
  if (primaryDied || !currentMonster) {
    emit(EVENTS.BARS);
    emit(EVENTS.HEADER_STATS);
    return;
  }

  // Monstro ataca o jogador: melee físico OU uma de suas magias (elemental, do
  // TFS — ver domain/combatFormulas.js: monsterAttack). Shielding treina como no
  // Tibia (só com escudo equipado).
  const atk = monsterAttack(currentMonster, getDef());
  G.hp = Math.max(0, G.hp - atk.dmg);
  if (G.equipment.shield) trainSkill('shielding', 1);
  const elKey = MONSTER_ELEMENT_KEYS[atk.element];
  const spellTag = atk.kind === 'spell' ? t('hunt.logElementTag', { element: elKey ? t(elKey) : atk.element }) : '';
  emit(EVENTS.LOG, t('log.monsterHitsYou', { name: currentMonster.name, dmg: atk.dmg, spellTag }));
  emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true, spellElement: atk.kind === 'spell' ? atk.element : null });

  // RTC — cura por spell/poção de vida/poção de mana: ver applyRtcHealing()
  // (compartilhada com o regen passivo fora de combate, ver startRegen()).
  applyRtcHealing(true);

  if (G.hp <= 0) {
    // Bênçãos reduzem a perda de XP e melhoram o revive; são consumidas na morte.
    const bless = G.blessings || 0;
    const lostPct = deathXpLossPct(bless);
    const xpLost = Math.floor(G.xp * lostPct);
    G.hp = Math.floor(getMaxHp() * reviveHpPct(bless));
    G.xp = Math.max(0, G.xp - xpLost);
    const blessNote = bless > 0 ? t('hunt.logBlessingsConsumed', { count: bless }) : '';
    emit(EVENTS.LOG, t('hunt.logPlayerDied', { xpLost, blessNote }));
    if (bless > 0) { G.blessings = 0; emit(EVENTS.BLESSINGS); }
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
  // Multiplicador de XP/Gold da zona: por padrão 1 (fiel ao Tibia); só difere
  // se o dono ligou os multiplicadores no Painel Admin (ver adminUseCases).
  const zoneGoldMult = getZoneMultiplier(G.activeZone, 'gold', 1);
  const zoneXpMult = getZoneMultiplier(G.activeZone, 'xp', 1);
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zoneGoldMult * worldGoldMultiplier(G.currentWorld) * boosts.gold * boostedMult * bonus.gold * getGoldRate());
  const staminaMult = isStaminaEnabled() ? staminaXpMult(G.stamina) : 1;
  const xpGained = Math.floor(mon.xp * zoneXpMult * worldXpMultiplier(G.currentWorld) * boosts.xp * boostedMult * bonus.xp * getXpRate() * staminaMult);

  G.gold += goldGained;
  G.totalGoldEarned += goldGained;
  G.totalKills++;

  // Hunt Analyzer: registra kill, XP e gold desta morte na sessão atual.
  huntSession.kills++;
  huntSession.xp += xpGained;
  huntSession.gold += goldGained;

  // Kill counters da zona atual
  G.killCounters = G.killCounters || {};
  G.killCounters[mon.defKey] = (G.killCounters[mon.defKey] || 0) + 1;

  // Battle Pass XP
  G.bpXp += Math.floor(xpGained * 0.01);
  checkBpTier();
  bumpMissionProgress('kills', 1);
  bumpMissionProgress('gold', goldGained);

  emit(EVENTS.LOG, t('log.monsterDied', { name: mon.name, xp: xpGained, gold: goldGained }));

  // Loot — chance efetiva de cada item é a override do dono (Painel Admin,
  // aba Loot) por cima do padrão do bestiário, quando houver (ver
  // domain/adminConfig.js: resolveMonsterLoot).
  const lootLine = [];
  let soldGold = 0;
  getMonsterLoot(mon.defKey, mon.loot).forEach(([itemId, chance]) => {
    if (Math.random() < (chance + boosts.loot + bonus.loot) * getLootRate()) {
      const item = ITEMS[itemId];
      // Auto-vender lixo: itens 'misc' baratos viram gold na hora, sem lotar a bag.
      const autoSell = G.autoSell && G.autoSell.enabled && item.type === 'misc' && (item.sell || 0) <= (G.autoSell.maxValue || 0);
      if (autoSell) {
        G.gold += item.sell || 0;
        huntSession.gold += item.sell || 0;
        soldGold += item.sell || 0;
      } else if (addItemToInventory(itemId)) {
        // Bag cheia (20 tipos distintos, ver domain/items.js: BAG_MAX_SLOTS) e
        // o item é um tipo NOVO: addItemToInventory recusa, e o loot simplesmente
        // não é capturado (o monstro ainda morre e dá XP/gold normalmente).
        huntSession.loot += item.sell || 0; // valor do loot pra o Hunt Analyzer
        lootLine.push(`${itemLogIcon(itemId)} ${item.name}`);
      }
    }
  });
  if (lootLine.length > 0) emit(EVENTS.LOG, t('log.lootLine', { items: lootLine.join(', ') }));
  if (soldGold > 0) emit(EVENTS.LOG, { html: t('log.autoSoldTrash', { gold: soldGold }), cat: 'suprimento' });

  // Relíquia (raridade) — cai SÓ no Boss Rush (bossOnly), nunca numa caçada
  // comum. O boss de uma zona (ver domain/bestiary.js: BOSS_MONSTER_IDS)
  // aparece no elenco normal daquela hunt — sem esse gate, matar ele
  // caçando normalmente também sorteava relíquia, deixando hunts comuns
  // dropar item raro (ex.: Wolf, boss de wolf_den, chegou a dropar Demon
  // Shield numa caçada comum). Cada raridade rola INDEPENDENTE das outras
  // (ver domain/rarity.js: rollIndependentRarityTiers) — não é uma escolha
  // única, então mais de uma pode bater no mesmo kill: vira uma relíquia PRA
  // CADA raridade que bateu (podem ser 0, 1 ou várias).
  if (bossOnly && BOSS_MONSTER_IDS.has(mon.defKey) && Math.random() < getRelicDropChance()) {
    const equippablePool = mon.loot
      .map(([id]) => id)
      .filter(id => ITEMS[id] && EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    const pool = equippablePool.length > 0
      ? equippablePool
      : equippableFallbackPool(mon.xp);
    if (pool.length > 0) {
      const hitTiers = rollIndependentRarityTiers(getRarityWeights());
      hitTiers.forEach(rarity => {
        // Cada relíquia sorteia seu próprio item — duas relíquias do mesmo
        // kill podem ser itens diferentes.
        const itemId = pool[Math.floor(Math.random() * pool.length)];
        const tier = RARITY_TIERS[rarity];
        G.relicSeq = (G.relicSeq || 0) + 1;
        G.relics = G.relics || [];
        G.relics.push({ id: 'relic_' + G.relicSeq, itemId, rarity, bonusPct: tier.bonusPct });
        const item = ITEMS[itemId];
        const pct = Math.round(tier.bonusPct * 100);
        emit(EVENTS.LOG, `<span class="log-loot" style="color:${tier.color};font-weight:700">${t('log.relicDrop', { tier: t(tier.name), item: item.name, pct })}</span>`);
        emit(EVENTS.NOTIFY, { msg: t('hunt.notifyRelicDrop', { tier: t(tier.name), item: item.name, pct }), type: 'success' });
      });
      if (hitTiers.length > 0) emit(EVENTS.INVENTORY);
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
    emit(EVENTS.NOTIFY, { msg: t('hunt.notifyZoneBossDefeated'), type: 'success' });
    emit(EVENTS.ZONE_PICKER);
  }

  // Boss Rush: vencer o tier atual desbloqueia o próximo, mais forte e com
  // aura diferente (ver domain/bestiary.js: bossTierMultiplier/bossAuraClass) —
  // é a "escada" de dificuldade infinita do Boss Rush, nunca some/regride.
  if (isBossOnlyHunt() && killedId === zone.boss && G.activeZone) {
    G.bossTiers = G.bossTiers || {};
    const nextTier = (G.bossTiers[G.activeZone] || 1) + 1;
    G.bossTiers[G.activeZone] = nextTier;
    emit(EVENTS.NOTIFY, { msg: t('hunt.notifyTierWon', { tier: nextTier - 1, nextTier }), type: 'success' });
    emit(EVENTS.BOSS_RUSH_PANEL);
  }

  // Remove a vítima da sala (por identidade — num ataque de área ela pode não
  // ser a da frente). O alvo passa a ser sempre o primeiro sobrevivente. Só
  // quando a sala esvazia (currentMonster null) o próximo tick gera novo grupo.
  const idx = currentPack.indexOf(mon);
  if (idx >= 0) currentPack.splice(idx, 1);
  currentMonster = currentPack[0] || null;
  // Deixa o morto 1s na Battle List com a vida zerada (indica que morreu), depois some.
  const deadEntry = { defKey: mon.defKey, name: mon.name, maxHp: mon.maxHp, uid: ++deadSeq };
  recentDead.push(deadEntry);
  setTimeout(() => { recentDead = recentDead.filter(d => d.uid !== deadEntry.uid); emit(EVENTS.BATTLE_LIST); }, 1000);
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
    emit(EVENTS.LOG, t('hunt.logLevelUp', { level: G.level }));
    emit(EVENTS.NOTIFY, { msg: t('hunt.notifyLevelUp', { level: G.level }), type: 'success' });
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
    // Stamina (se ligada no Admin): cai 1min/min caçando; regenera ~1/3 disso
    // descansando. O tick roda a cada 2s → 2/60 min por tick.
    if (isStaminaEnabled()) {
      if (typeof G.stamina !== 'number') G.stamina = STAMINA_MAX;
      const step = 2 / 60;
      G.stamina = G.hunting
        ? Math.max(0, G.stamina - step)
        : Math.min(STAMINA_MAX, G.stamina + step / 3);
    }
    emit(EVENTS.BARS);
    emit(EVENTS.HEADER_STATS);
    if (G.hunting) emit(EVENTS.HUNT_STATS); // mantém XP/h, gold/h vivos no tempo
  }, 2000);

  // RTC fora de combate: parado ou "procurando" entre um monstro e outro,
  // doHuntTick não roda cura nenhuma (só entra no bloco de cura depois de
  // resolver o ataque de um monstro vivo) — sem isto o jogador podia emendar
  // pra próxima luta sem vida mesmo com a cura automática ligada. Enquanto há
  // um monstro na frente, quem cuida da cura é o próprio doHuntTick. Roda num
  // intervalo PRÓPRIO de 500ms (não junto do regen de 2s acima) pra respeitar
  // de verdade o exhaust de 1s da poção — preso ao tick de 2s, o intervalo
  // real entre poções virava 2s (ou mais) em vez do 1s combinado.
  if (rtcHealInterval) clearInterval(rtcHealInterval);
  rtcHealInterval = setInterval(() => {
    if (G.vocation && !currentMonster) applyRtcHealing(G.hunting);
  }, 500);
}
