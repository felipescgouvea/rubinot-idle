// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G, ACCOUNT } from './gameStore.js?v=129';
import { startHuntSession, stopHuntSession, getHuntState } from '../infrastructure/authClient.js?v=131';
import { ZONES, boostedZoneForDate, BOSS_MONSTER_IDS, bossTierMultiplier, bossAuraClass } from '../domain/bestiary.js?v=136';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=156';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=126';
import { computeBoostMods } from '../domain/shopCatalog.js?v=128';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../domain/rtcConfig.js?v=159';
import { worldXpMultiplier, worldGoldMultiplier } from '../domain/progression.js?v=128';
import { calcDamage, spawnMonsterInstance, spellAttackDamage, runeDamage, monsterAttack } from '../domain/combatFormulas.js?v=157';
import { elementMod } from '../domain/elements.js?v=125';
import { STAMINA_MAX, staminaXpMult } from '../domain/stamina.js?v=125';
import { ITEMS, EQUIPPABLE_TYPES, resolveEquippedItem, equippableFallbackPool } from '../domain/items.js?v=138';
import { MONSTERS } from '../domain/bestiary.js?v=136';
import { RARITY_TIERS, rollIndependentRarityTiers } from '../domain/rarity.js?v=126';
import { areaMaxTargets, areaName, isAreaAttack } from '../domain/attackAreas.js?v=125';
import { spellEffectName, runeEffectName, basicAttackMissile } from '../domain/combatFx.js?v=125';
import { emit, EVENTS } from '../shared/eventBus.js?v=126';
import { getAtk, getDef, getMagic, getMaxHp, getMaxMana, getSpd, getEquippedWeaponSkillId } from './stats.js?v=126';
import { addItemToInventory } from './inventoryCore.js?v=127';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=126';
import { saveGame } from './saveGameUseCase.js?v=129';
import { getCombatBonuses } from './bonuses.js?v=126';
import { getXpRate, getGoldRate, getLootRate, getRelicDropChance, getRarityWeights, getSpawnDelayRange, getZoneMultiplier, isStaminaEnabled, isConsumeAmmo, getZoneSpawn, getMonsterLoot } from './adminUseCases.js?v=129';
import { itemLogIcon, monsterLogIcon } from './logIcons.js?v=127';
import { t } from '../i18n/i18n.js?v=141';

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

// Jogador escolhe manualmente qual criatura da sala atacar (clique na Battle
// List ou no palco) — igual ao Tibia real, onde clicar num monstro o torna o
// alvo. currentMonster é só uma REFERÊNCIA dentro de currentPack — a ordem
// da array (posição na Battle List/palco) nunca muda por causa disso, só
// troca QUEM currentMonster aponta (golpe básico/magia/runa sempre miram
// currentMonster). Reordenar a array fazia a Battle List inteira "pular" de
// posição a cada clique — bug reportado pelo Felipe.
export function selectTarget(uid) {
  if (!G.hunting || !currentPack.length) return;
  const key = String(uid);
  const picked = currentPack.find(m => String(m.uid) === key);
  if (!picked || picked === currentMonster) return; // já é o alvo, ou uid não existe na sala
  currentMonster = picked;
  emit(EVENTS.MONSTER_DISPLAY, {});
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

// ---- reconciliação com o servidor de caçada autoritativo (ver
// infrastructure/authClient.js: startHuntSession/stopHuntSession/getHuntState
// e server/src/huntEngine.js) ----
// O servidor roda seu PRÓPRIO combate (simplificado, sem magia/RTC ainda —
// Marco 2) independente de qualquer request; é ele quem decide de verdade
// quanto de gold/XP o jogador ganhou. A cada poll, o que ele diz SOBRESCREVE
// G.gold/xp/level — de propósito, mesmo que ande pra trás em relação ao
// combate rico que a UI mostra localmente (aceito conscientemente até o
// Marco 4 trazer paridade de combate no servidor).
let reconcileInterval = null;
// Reduzido de 5000 pra 1500, depois 750, depois 375 (pedido repetido do
// Felipe: "diminua pela metade") — quanto maior o intervalo, maior o salto
// visível de gold/xp/hp quando o servidor sobrescreve o preview local. Ainda
// é só um GET /hunt/state leve; abaixo disso o ganho de "tempo real" deixa de
// compensar o volume de requisições.
const RECONCILE_MS = 375;
// Instante (epoch ms) do último session.lastKill já processado (ver
// server/src/huntEngine.js: settleKill) — evita reprocessar o mesmo kill em
// polls sucessivos, já que lastKill fica "parado" no servidor até a próxima morte.
let lastSeenKillAt = 0;

// Desde o Marco 4, nível/skills/equipamento NÃO são mais enviados — o
// servidor lê de player_stats/player_skills/player_equipment (autoritativos).
// Só vocação/zona/mundo continuam vindo do cliente (ver authClient.js:
// startHuntSession).
function buildHuntSnapshot() {
  // rtc (prioridade de magia/runa, limiares de cura) é só PREFERÊNCIA — sem
  // risco de forjar valor, o servidor sempre valida mana/cooldown/posse do
  // item na hora de usar (ver server/src/huntEngine.js). Travado pra sessão
  // inteira: mudar o RTC no meio da caçada só vale a partir da próxima.
  return { slot: ACCOUNT.activeSlot, zoneId: G.activeZone, bossOnly, vocation: G.vocation, world: G.currentWorld, rtc: G.rtc };
}

async function reconcileWithServer() {
  const res = await getHuntState(ACCOUNT.activeSlot);
  if (!res.ok || !res.stats) return;
  const s = res.stats;
  const leveledUp = s.level > G.level;
  G.gold = s.gold;
  G.xp = s.xp;
  G.level = s.level;
  G.totalGoldEarned = s.total_gold_earned;
  G.totalKills = s.total_kills;
  if (leveledUp) {
    G.hp = getMaxHp();
    G.mana = getMaxMana();
    emit(EVENTS.LEVEL_UP, { level: G.level });
    emit(EVENTS.CHAR_INFO);
    emit(EVENTS.WORLDS_PANEL);
    emit(EVENTS.ZONE_PICKER);
  } else if (s.hp != null && s.mana != null) {
    // HP/mana reais (Marco 5) — o servidor agora simula contra-ataque/cura de
    // verdade; sem level-up no meio, só espelha o que ele diz (clamp defensivo
    // contra o teto local, caso o cálculo de equipamento diverja por um instante).
    G.hp = Math.min(getMaxHp(), s.hp);
    G.mana = Math.min(getMaxMana(), s.mana);
  }
  // Inventário e relíquias (Marco 3) — mesma troca de fonte de verdade: o
  // servidor decide o loot/relic drop, o cliente só espelha. inventoryOrder
  // (ordem de arraste da UI) ganha os ids novos no fim e perde os que
  // zeraram, sem embaralhar o resto (mesmo espírito do loadGame original).
  if (res.inventory) {
    G.inventory = res.inventory;
    Object.keys(G.inventory).forEach(id => { if (!G.inventoryOrder.includes(id)) G.inventoryOrder.push(id); });
    G.inventoryOrder = G.inventoryOrder.filter(id => (G.inventory[id] || 0) > 0);
    emit(EVENTS.INVENTORY);
  }
  if (res.relics) {
    G.relics = res.relics;
    emit(EVENTS.INVENTORY);
  }
  // Bênçãos e stamina (Marco 6) — autoritativas: bênçãos só mudam por compra
  // (ver blessingUseCases.js: buyBlessing) ou morte (consumidas no servidor);
  // stamina cai caçando e regenera parada, sempre calculada lá.
  if (s.blessings != null) { G.blessings = s.blessings; emit(EVENTS.BLESSINGS); }
  if (s.stamina != null) { G.stamina = s.stamina; }
  // Skills (Marco 4) — o motor de combate treina server-side (huntEngine.js:
  // trainSkill), mas nada devolvia esse progresso: G.sk ficava travado no
  // valor local do save, sem nunca ser corrigido pelo real do servidor.
  if (res.skills) { G.sk = res.skills; emit(EVENTS.TRAINING_PANEL); emit(EVENTS.CHAR_PANEL); }
  // Evento de morte REAL (Marco 6b) — o tick cosmético local não grava mais
  // gold/xp/loot/relic nenhum (ver doHuntTick); quem alimenta o log de kill,
  // o Hunt Analyzer, o Battle Pass, as missões, os contadores de bestiário/
  // task e o desbloqueio de zona/tier do Boss Rush é o ÚLTIMO kill real que o
  // servidor reporta aqui (server/src/huntEngine.js: session.lastKill).
  if (res.lastKill && res.lastKill.at && res.lastKill.at > lastSeenKillAt) {
    lastSeenKillAt = res.lastKill.at;
    applyServerKillEvents(res.lastKill);
  }
  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);
}

// Reage a UM kill real do servidor (o mais recente — ver reconcileWithServer).
// Só lê/deriva progresso a partir de números que o servidor já confirmou;
// nunca inventa/estima gold ou xp aqui.
function applyServerKillEvents(k) {
  huntSession.kills++;
  huntSession.xp += k.xp || 0;
  huntSession.gold += k.gold || 0;
  (k.loot || []).forEach(id => { const it = ITEMS[id]; if (it) huntSession.loot += it.sell || 0; });

  if (k.defKey) {
    G.killCounters = G.killCounters || {};
    G.killCounters[k.defKey] = (G.killCounters[k.defKey] || 0) + 1;
  }
  G.bpXp += Math.floor((k.xp || 0) * 0.01);
  checkBpTier();
  bumpMissionProgress('kills', 1);
  bumpMissionProgress('gold', k.gold || 0);

  emit(EVENTS.LOG, t('log.monsterDied', { name: k.monster, xp: k.xp || 0, gold: k.gold || 0 }));
  if (k.loot && k.loot.length) {
    const lootLine = k.loot.map(id => `${itemLogIcon(id)} ${(ITEMS[id] && ITEMS[id].name) || id}`);
    emit(EVENTS.LOG, { html: t('log.lootLine', { items: lootLine.join(', ') }), cat: 'loot' });
  }
  if (k.relics && k.relics.length) {
    k.relics.forEach(r => {
      const tier = RARITY_TIERS[r.rarity];
      const item = ITEMS[r.itemId || r.item_id];
      if (!tier || !item) return;
      const bonusPct = r.bonusPct != null ? r.bonusPct : Number(r.bonus_pct);
      const pct = Math.round(bonusPct * 100);
      emit(EVENTS.LOG, { html: `<span class="log-loot" style="color:${tier.color};font-weight:700">${t('log.relicDrop', { tier: t(tier.name), item: item.name, pct })}</span>`, cat: 'loot' });
      emit(EVENTS.NOTIFY, { msg: t('hunt.notifyRelicDrop', { tier: t(tier.name), item: item.name, pct }), type: 'success' });
    });
  }
  if (k.defKey) {
    emit(EVENTS.MONSTER_KILLED, { monsterId: k.defKey });
    const zone = ZONES[G.activeZone];
    if (zone && k.defKey === zone.boss && G.activeZone) {
      G.defeatedZoneBosses = G.defeatedZoneBosses || [];
      if (!G.defeatedZoneBosses.includes(G.activeZone)) {
        G.defeatedZoneBosses.push(G.activeZone);
        emit(EVENTS.NOTIFY, { msg: t('hunt.notifyZoneBossDefeated'), type: 'success' });
        emit(EVENTS.ZONE_PICKER);
      }
      if (bossOnly) {
        G.bossTiers = G.bossTiers || {};
        const nextTier = (G.bossTiers[G.activeZone] || 1) + 1;
        G.bossTiers[G.activeZone] = nextTier;
        emit(EVENTS.NOTIFY, { msg: t('hunt.notifyTierWon', { tier: nextTier - 1, nextTier }), type: 'success' });
        emit(EVENTS.BOSS_RUSH_PANEL);
        if (G.hunting) stopHunt(); // real: o boss caiu de verdade — pausa mesmo que o tick cosmético ainda não tenha percebido
      }
    }
  }
  emit(EVENTS.KILL_COUNTERS);
  emit(EVENTS.LOOT);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  saveGame();
}

// Liga o loop local (animação/log/combate cosmético) + o polling de
// reconciliação com o servidor — compartilhado entre um início normal
// (startHunt) e a retomada no boot de uma sessão que sobreviveu no servidor
// enquanto a aba estava fechada (ver checkAndResumeHuntSession abaixo).
function beginLocalLoop() {
  huntSession = newHuntSession(); // zera o Hunt Analyzer a cada nova caçada
  nextSpawnAt = Date.now() + searchDelay(); // começa procurando (boneco anda)
  emit(EVENTS.HUNT_BUTTON, { hunting: true });
  emit(EVENTS.HUNT_STATS);
  emit(EVENTS.MONSTER_DISPLAY, {}); // limpa o alvo e liga o modo "procurando"
  huntInterval = setInterval(doHuntTick, Math.max(400, 2400 / getSpd()));
  if (reconcileInterval) clearInterval(reconcileInterval);
  reconcileInterval = setInterval(reconcileWithServer, RECONCILE_MS);
}

export function startHunt() {
  if (!G.vocation) { emit(EVENTS.NOTIFY, { msg: t('hunt.needVocation'), type: 'error' }); return; }
  if (!G.activeZone) { emit(EVENTS.NOTIFY, { msg: t('hunt.needZone'), type: 'error' }); return; }
  const zone = ZONES[G.activeZone];
  // Sem restrição de nível pra caçar — as criaturas escalam com o nível do
  // jogador; entrar numa zona forte cedo é escolha (e risco) do jogador.
  G.hunting = true;
  emit(EVENTS.LOG, bossOnly
    ? t('hunt.logBossRushChallenge', { icon: monsterLogIcon(zone.boss), zone: t(zone.name) })
    : t('hunt.logEnterZone', { icon: monsterLogIcon(zone.monsters[0]), zone: t(zone.name) }));
  beginLocalLoop();

  startHuntSession(buildHuntSnapshot()).then(res => {
    if (!res.ok) emit(EVENTS.NOTIFY, { msg: `⚠️ Caçada não confirmada pelo servidor: ${res.error}`, type: 'error' });
    else reconcileWithServer(); // não espera o 1º intervalo de RECONCILE_MS pra puxar o estado real
  });
}

// Chamado UMA VEZ no boot (ver main.js: bootGame), antes de applyOfflineProgress().
// O servidor de caçada continua tickando sozinho mesmo com a aba fechada (ver
// server/src/huntEngine.js) — se a sessão ainda está ativa lá, o tempo fechado
// JÁ foi contado de verdade pelo servidor; rodar TAMBÉM o cálculo aproximado de
// applyOfflineProgress contaria a mesma janela duas vezes. Retorna true se
// retomou (quem chamou deve pular o applyOfflineProgress local nesse caso).
export async function checkAndResumeHuntSession() {
  if (!G.vocation) return false;
  const res = await getHuntState(ACCOUNT.activeSlot);
  if (!res.ok) return false;
  // Sincroniza SEMPRE (parado ou caçando) — antes só chamava reconcileWithServer
  // quando havia uma sessão pra retomar; parado, G.gold/xp/level/hp/mana ficavam
  // com o que estivesse no save (local ou nuvem), por mais desatualizado que
  // estivesse, e o cálculo aproximado de applyOfflineProgress rodava em cima
  // desse valor já errado, compondo o erro a cada boot.
  await reconcileWithServer();
  if (!res.hunting) return false;
  G.activeZone = res.zoneId || G.activeZone;
  G.hunting = true;
  beginLocalLoop();
  emit(EVENTS.LOG, t('hunt.logEnterZone', { icon: '⚔️', zone: t(ZONES[G.activeZone] ? ZONES[G.activeZone].name : G.activeZone) }));
  return true;
}

export function stopHunt() {
  G.hunting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  if (reconcileInterval) { clearInterval(reconcileInterval); reconcileInterval = null; }
  currentMonster = null;
  currentPack = [];
  recentDead = [];
  emit(EVENTS.HUNT_BUTTON, { hunting: false });
  emit(EVENTS.BATTLE_LIST);
  emit(EVENTS.LOG, t('hunt.logPaused'));
  stopHuntSession(ACCOUNT.activeSlot).then(reconcileWithServer);
}

// RTC — versão COSMÉTICA da cura por spell/poção de vida/poção de mana.
// Chamada tanto no tick de combate (doHuntTick, todo tick) quanto no regen
// passivo (startRegen, a cada 2s). Desde o Marco 6b, quem cura de verdade é
// SÓ o servidor (server/src/huntEngine.js: applyRtcHealing) — HP/mana real só
// mudam via reconcileWithServer(). Aqui só disparamos o flash visual de "cura"
// quando os números (já reconciliados) indicam que o RTC deveria estar
// curando, sem tocar em G.hp/G.mana/G.inventory nem treinar skill.
function applyRtcHealing() {
  if (!G.rtc || !G.vocation) return;
  const maxHp = getMaxHp();
  const hpPct = maxHp > 0 ? (G.hp / maxHp) * 100 : 100;
  const healSpellId = G.rtc.healSpell || defaultHealSpellId(G.vocation, G.level);
  const healSpell = isSpellAvailable(healSpellId, G.vocation, G.level) ? SPELLS[healSpellId] : null;
  const spellWants = healSpell && G.hp > 0 && hpPct < G.rtc.healSpellThreshold && G.mana >= healSpell.mana;
  const potionWants = G.rtc.healPotion && G.hp > 0 && hpPct < G.rtc.healPotionThreshold && (G.inventory[G.rtc.healPotion] || 0) > 0;
  if (spellWants || potionWants) emit(EVENTS.PLAYER_BATTLE_SIDE, { healing: true });
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
  // Nota: dano aqui é só PREVIEW visual (barra de vida do monstro na tela,
  // popups de dano) — não grava gold/xp/loot/relic nenhum (isso é 100% do
  // servidor, ver applyServerKillEvents). Por isso não aplica mais lifeleech
  // em G.hp: curar o jogador de verdade é papel exclusivo do servidor.
  function strike(target, rawDmg) {
    const cb = getCombatBonuses(target.defKey, Date.now());
    let dmg = Math.max(1, Math.floor(rawDmg * (cb.damage > 1 ? cb.damage : 1)));
    target.hp -= dmg;
    target._hitAt = Date.now(); // marca o instante do golpe (flash na Battle List, inclui área)
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
  // Munição não é mais consumida AQUI — quem gasta a flecha/dardo de verdade é
  // o servidor (huntEngine.js). Só LEMOS a última contagem reconciliada pra
  // decidir a animação (golpe normal vs. soco sem munição); nunca decrementamos.
  let basicRaw, outOfAmmo = false;
  if (voc.attackSkill === 'distance' && isConsumeAmmo()) {
    const ammoId = G.equipment.ammo;
    if (ammoId && (G.inventory[ammoId] || 0) > 0) {
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
  // Treino de skill (golpe corpo-a-corpo/soco/distância) não roda mais aqui —
  // é o servidor quem treina de verdade (huntEngine.js: trainSkill); G.sk só
  // muda via reconcileWithServer().
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
  const healSpellIdForReserve = G.rtc.healSpell || defaultHealSpellId(G.vocation, G.level);
  const healSpellForReserve = isSpellAvailable(healSpellIdForReserve, G.vocation, G.level) ? SPELLS[healSpellIdForReserve] : null;
  const healManaReserve = healSpellForReserve ? healSpellForReserve.mana : 0;
  // Fila de prioridade ÚNICA misturando magia e runa (igual ao RTCaster real:
  // a caixinha 1 pode ser uma magia e a 2 uma runa — usa a primeira PRONTA,
  // seja ela qual for) — ver domain/rtcConfig.js: normalizeAttackSpells/
  // isRuneEntry. Ambas competem pelo mesmo cooldown de grupo (2s).
  const ready = isAttackGroupReady()
    ? normalizeAttackSpells(G.rtc).map(entry => {
      if (isRuneEntry(entry)) {
        const id = runeEntryId(entry);
        const rune = ITEMS[id];
        const ok = rune && canUseAttackRune(id, G.vocation, magic) && (G.inventory[id] || 0) > 0;
        return ok ? { kind: 'rune', id, rune } : null;
      }
      const s = SPELLS[entry];
      const ok = s && isSpellAvailable(entry, G.vocation, G.level) && G.mana - healManaReserve >= s.mana && isSpellReady(entry);
      return ok ? { kind: 'spell', id: entry, s } : null;
    }).filter(Boolean)
    : [];
  let pick = null;
  if (ready.length) {
    pick = ready[0]; // padrão: a primeira da prioridade
    if (G.rtc.smartElement) {
      // Prioridade inteligente: entre as prontas, a mais forte contra a
      // fraqueza da criatura da frente (maior modificador elemental).
      const elOf = e => e.kind === 'rune' ? (e.rune.element || 'physical') : e.s.element;
      pick = ready.reduce((best, cur) =>
        elementMod(primary.defKey, elOf(cur)) > elementMod(primary.defKey, elOf(best)) ? cur : best, ready[0]);
    }
  }
  if (pick && pick.kind === 'rune') {
    const rune = pick.rune;
    areaId = rune.area || 'single';
    element = rune.element || 'physical';
    hitFn = () => runeDamage({ rune, level: G.level, magicLevel: magic }); // fórmula do Tibia (nível/5 + ML·a + base)
    combatFx = { effect: runeEffectName(pick.id), shape: areaId, targetUid: primary.uid };
    // Consumo real da runa é só do servidor (huntEngine.js); aqui a checagem de
    // `ready` acima já usa a última contagem reconciliada, sem decrementar.
    startAttackGroupCd();
    emit(EVENTS.LOG, { html: t('log.rtcRuneUsed', { name: rune.name }), cat: 'suprimento' });
  } else if (pick && pick.kind === 'spell') {
    const atkSpellId = pick.id, atkSpell = pick.s;
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
    // Gasto real de mana e treino de magic são só do servidor; localmente só
    // pausamos o cooldown (ephemeral, pra ritmo da animação — ver isSpellReady).
    startSpellCd(atkSpellId, atkSpell.cd);
    startAttackGroupCd();
    emit(EVENTS.LOG, { html: t('log.spellCast', { words: atkSpell.words }), cat: 'magia' });
    combatFx = { effect: spellEffectName(atkSpellId, atkSpell.element), shape: areaId, targetUid: primary.uid };
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
  // atingidas pela área) — só o lado COSMÉTICO (some da sala/Battle List).
  // Gold/XP/loot/relic reais da morte são só do servidor (huntEngine.js),
  // refletidos no cliente por applyServerKillEvents() via reconcileWithServer().
  const primaryDied = primary.hp <= 0;
  const deaths = currentPack.filter(m => m.hp <= 0);
  deaths.forEach(m => cosmeticMonsterDeath(m));

  // Boss Rush: cada tier vencido PAUSA a caçada — o jogador precisa clicar
  // explicitamente pra desafiar o próximo tier (não sobe automático). Como no
  // Boss Rush a sala é sempre 1 boss, qualquer morte aqui = tier vencido. Esta
  // é a pausa RESPONSIVA baseada no combate cosmético local (aproximado); a
  // pausa "de verdade" (baseada no kill real do servidor) roda em
  // applyServerKillEvents() como reforço, pro caso da sessão ter sido retomada
  // sem o tick cosmético ter presenciado a morte.
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
    reconcileWithServer(); // ver comentário abaixo (mesmo motivo do caminho completo)
    return;
  }

  // Monstro ataca o jogador: melee físico OU uma de suas magias (elemental, do
  // TFS — ver domain/combatFormulas.js: monsterAttack). Só PREVIEW: o dano real
  // em G.hp e o treino de shielding são calculados de verdade pelo servidor
  // (huntEngine.js) — aqui só usamos `atk` pro texto/flash do log e da UI.
  const atk = monsterAttack(currentMonster, getDef());
  const elKey = MONSTER_ELEMENT_KEYS[atk.element];
  const spellTag = atk.kind === 'spell' ? t('hunt.logElementTag', { element: elKey ? t(elKey) : atk.element }) : '';
  emit(EVENTS.LOG, t('log.monsterHitsYou', { name: currentMonster.name, dmg: atk.dmg, spellTag }));
  emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true, spellElement: atk.kind === 'spell' ? atk.element : null });

  // RTC — flash cosmético de cura: ver applyRtcHealing() (compartilhada com o
  // regen passivo fora de combate, ver startRegen()). HP/mana/morte reais só
  // chegam via reconcileWithServer() — o cliente não decide mais quando o
  // jogador morre (ver applyServerKillEvents/reconcileWithServer para bênçãos).
  applyRtcHealing();

  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);
  // Puxa o servidor NA HORA de cada tick de combate, em vez de só confiar no
  // poll periódico (RECONCILE_MS) — antes gold/xp/dano/vida real só chegavam
  // até 375ms depois do golpe/dano cosmético aparecer na tela, um atraso
  // perceptível (reportado pelo Felipe: "o golpe sai, mas o dano demora, a xp
  // demora pra entrar"). O poll do reconcileInterval continua rodando por
  // trás como rede de segurança pros momentos sem tick (procurando, parado).
  reconcileWithServer();
}

// Remove a vítima da sala (por identidade — num ataque de área ela pode não
// ser a que está sendo mirada) e mantém a Battle List consistente. Só
// COSMÉTICO: nenhum gold/xp/loot/relic é concedido aqui (ver
// applyServerKillEvents, alimentado pelo kill real do servidor).
function cosmeticMonsterDeath(mon) {
  const idx = currentPack.indexOf(mon);
  if (idx >= 0) currentPack.splice(idx, 1);
  if (currentMonster === mon) currentMonster = currentPack[0] || null;
  // Deixa o morto 1s na Battle List com a vida zerada (indica que morreu), depois some.
  const deadEntry = { defKey: mon.defKey, name: mon.name, maxHp: mon.maxHp, uid: ++deadSeq };
  recentDead.push(deadEntry);
  setTimeout(() => { recentDead = recentDead.filter(d => d.uid !== deadEntry.uid); emit(EVENTS.BATTLE_LIST); }, 1000);
  // sala limpa: volta a "procurar" (boneco anda de novo por um tempinho)
  if (!currentMonster) nextSpawnAt = Date.now() + searchDelay();
  emit(EVENTS.MONSTER_DISPLAY, { killed: mon.defKey });
  emit(EVENTS.BATTLE_LIST);
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
  // ser a que está sendo mirada). Só troca o alvo se quem morreu FOI o alvo
  // (senão o jogador que escolheu manualmente um alvo específico o perderia
  // sempre que outro bicho da sala morresse). Só quando a sala esvazia
  // (currentMonster null) o próximo tick gera novo grupo.
  const idx = currentPack.indexOf(mon);
  if (idx >= 0) currentPack.splice(idx, 1);
  if (currentMonster === mon) currentMonster = currentPack[0] || null;
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
  // Salva a cada kill (não só no setInterval de 30s do main.js) — G.lastSave
  // precisa ficar sempre "fresco" durante a caçada. Sem isso, um F5 logo
  // depois de uma janela de até ~30s sem save fazia applyOfflineProgress()
  // (ver persistenceUseCases.js) reconstruir esse intervalo como "progresso
  // offline" por cima da XP que a caçada AO VIVO já tinha dado — contava a
  // mesma janela de tempo duas vezes (uma vez de verdade, outra aproximada).
  saveGame();
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
    if (G.vocation && !currentMonster) applyRtcHealing();
  }, 500);
}
