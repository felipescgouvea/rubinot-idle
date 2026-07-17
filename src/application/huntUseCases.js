// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G, ACCOUNT } from './gameStore.js?v=129';
import { startHuntSession, stopHuntSession, getHuntState } from '../infrastructure/authClient.js?v=133';
import { ZONES } from '../domain/bestiary.js?v=137';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=156';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=126';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../domain/rtcConfig.js?v=159';
import { monsterAttack } from '../domain/combatFormulas.js?v=157';
import { elementMod } from '../domain/elements.js?v=125';
import { STAMINA_MAX } from '../domain/stamina.js?v=125';
import { ITEMS } from '../domain/items.js?v=138';
import { MONSTERS } from '../domain/bestiary.js?v=137';
import { RARITY_TIERS } from '../domain/rarity.js?v=126';
import { spellEffectName, runeEffectName, basicAttackMissile } from '../domain/combatFx.js?v=126';
import { emit, EVENTS } from '../shared/eventBus.js?v=126';
import { getDef, getMagic, getMaxHp, getMaxMana, getSpd } from './stats.js?v=126';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=126';
import { saveGame } from './saveGameUseCase.js?v=129';
import { isStaminaEnabled, isConsumeAmmo } from './adminUseCases.js?v=129';
import { itemLogIcon, monsterLogIcon } from './logIcons.js?v=127';
import { t } from '../i18n/i18n.js?v=142';

// Rótulo (chave i18n) do elemento da magia do monstro, pro log de combate.
const MONSTER_ELEMENT_KEYS = { fire: 'log.elementFire', energy: 'log.elementEnergy', ice: 'log.elementIce', earth: 'log.elementEarth', death: 'log.elementDeath', holy: 'log.elementHoly', physical: 'log.elementPhysical' };

let huntInterval = null;
let regenInterval = null;
let rtcHealInterval = null;
// currentMonster/currentPack são um ESPELHO fiel da sala REAL do servidor
// (session.currentPack, ver server/src/huntEngine.js) — populados por
// applyServerPack() a cada reconcileWithServer(), NUNCA por uma simulação
// local. currentMonster é sempre currentPack[0] (o alvo que o servidor
// realmente ataca/é atacado), a menos que o jogador tenha clicado noutro
// (manualTargetUid) — troca só o DESTAQUE visual, nunca o que leva dano de
// verdade (isso sempre foi resolvido no servidor, mesmo antes desta correção).
let currentMonster = null;
let currentPack = [];
// uid -> última leitura conhecida {defKey,name,hp,maxHp} do pack do servidor —
// a base de comparação de applyServerPack() pra decidir quem "apareceu",
// "levou dano" ou "morreu" entre um poll e o próximo.
let prevPackByUid = new Map();
// Clique manual na Battle List/palco (ver selectTarget) — sticky até o alvo
// escolhido sumir da sala real (morreu) ou a caçada reiniciar.
let manualTargetUid = null;
// Monstros mortos há menos de 1s: continuam aparecendo na Battle List com a
// vida ZERADA (indicando a morte) por 1 segundo antes de sumir (ver
// applyServerPack + ui/huntPanel.js: renderBattleList).
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
// Tamanho do grupo, instante do próximo spawn e o RNG de quem aparece são
// decididos 100% pelo servidor agora (ver server/src/huntEngine.js: tick/
// resolveZoneSpawn/spawnMonsterInstance) — o cliente só espelha o resultado
// via applyServerPack(). bossOnly continua aqui: é preferência de SESSÃO
// (nunca vai pro save) enviada no snapshot de hunt-start (buildHuntSnapshot)
// e também usada localmente só pra escolher a variante certa da mensagem de
// log ("Tier X apareceu" vs. "apareceu") em applyServerPack.
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
  manualTargetUid = key;
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
// Reduzido de 5000 pra 1500, depois 750, depois 375, agora 250 (auditoria do
// combate: o poll deixou de ser só uma "rede de segurança" atrás de uma
// simulação local cosmética — desde que currentPack/currentMonster passaram a
// vir DIRETO do servidor (ver applyServerPack), o poll é a ÚNICA fonte da
// cadência visual de combate, então precisa ser mais rápido que antes pra não
// parecer travado). Ainda é só um GET /hunt/state leve; abaixo disso o ganho
// de "tempo real" deixa de compensar o volume de requisições.
const RECONCILE_MS = 250;
// Sobe a cada início/fim de caçada (ver beginLocalLoop/stopHuntLocalOnly).
// Cada reconcileWithServer() guarda o epoch de quando FOI DISPARADO e, ao
// receber a resposta (fetch pode demorar mais que RECONCILE_MS por latência
// de rede), descarta o resultado se o epoch já mudou nesse meio-tempo — sem
// isso, um poll disparado ENQUANTO ainda caçava podia responder DEPOIS do
// jogador já ter clicado "Stop Hunt" (ou até de já ter dado Start de novo) e
// sobrescrever G.hp/G.mana com um snapshot velho, fora de ordem — bug
// reportado: "hp e mana ficam se mexendo por vários segundos" depois de
// pausar, e mana "cai pela metade do nada" ao reiniciar (respostas atrasadas
// da caçada ANTERIOR chegando depois, uma de cada vez, cada uma sobrescrevendo
// com um valor diferente).
let reconcileEpoch = 0;
// Instante (epoch ms) do último session.lastKill já processado (ver
// server/src/huntEngine.js: settleKill) — evita reprocessar o mesmo kill em
// polls sucessivos, já que lastKill fica "parado" no servidor até a próxima morte.
let lastSeenKillAt = 0;
// Mesma ideia de lastSeenKillAt, pro evento de morte (ver server/src/
// huntEngine.js: resolveTick — hp<=0 agora encerra a sessão de verdade e
// grava stats.last_death, em vez de reviver em silêncio e seguir caçando).
let lastSeenDeathAt = 0;
// id da sessão de caçada que ESTE cliente iniciou por último (ver
// startHunt/checkAndResumeHuntSession) — usado pra só aceitar um last_death
// que pertença a ELA, nunca a uma sessão antiga já substituída (ver
// reconcileWithServer: sem isso, trocar de zona rápido podia mostrar a morte
// da hunt ANTERIOR como se fosse da nova, com o monstro errado).
let currentSessionId = null;
// true enquanto um /hunt/start está em voo — nessa janela, o servidor pode
// responder /hunt/state com hunting:false só porque a sessão NOVA ainda não
// terminou de ser criada (a antiga já fechou); reconcileWithServer não deve
// interpretar isso como "a caçada atual morreu" (ver startHunt).
let starting = false;

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
  const myEpoch = reconcileEpoch;
  const res = await getHuntState(ACCOUNT.activeSlot);
  // Descarta resposta atrasada de um poll disparado numa caçada que já foi
  // parada/reiniciada nesse meio-tempo (ver comentário de reconcileEpoch).
  if (myEpoch !== reconcileEpoch) return;
  if (!res.ok || !res.stats) return;
  const s = res.stats;
  const leveledUp = s.level > G.level;
  // HP de ANTES desta reconciliação — comparado com s.hp depois de aplicado,
  // é o que decide se o monstro real da frente acabou de bater no jogador
  // (ver applyServerPack mais abaixo). Preview local não inventa mais esse
  // número: ou vem de um contra-ataque de verdade já refletido em s.hp, ou
  // não é logado.
  const prevPlayerHp = G.hp;
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
  // Morte de verdade (ver server/src/huntEngine.js: resolveTick — hp<=0 agora
  // ENCERRA a sessão de verdade em vez de reviver em silêncio e seguir
  // caçando pra sempre, bug reportado pelo Felipe: "quando esta em iminente
  // morte recupera a vida e nao mostra em nenhum lugar o que realmente
  // houve"). Detecta comparando o que o cliente ainda acha que está caçando
  // com o que o servidor diz agora — se o servidor já não está mais
  // caçando mas o cliente ainda acha que sim, foi ele quem encerrou.
  if (G.hunting && !res.hunting && !starting) {
    const d = s.last_death;
    // Só mostra/reage à morte se ela pertence à sessão QUE ESTE CLIENTE
    // acha que está rodando agora (currentSessionId, ver startHunt) — sem
    // isso, uma morte real da hunt ANTERIOR (já substituída) podia ser
    // exibida como se fosse da atual, com o monstro errado.
    if (d && d.at && d.at > lastSeenDeathAt && d.sessionId && d.sessionId === currentSessionId) {
      lastSeenDeathAt = d.at;
      emit(EVENTS.LOG, t('hunt.logYouDied', { monster: d.monster, xpLost: d.xpLost }));
      emit(EVENTS.NOTIFY, { msg: t('hunt.notifyYouDied', { monster: d.monster, xpLost: d.xpLost }), type: 'error' });
    }
    stopHuntLocalOnly();
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
  // A sala REAL de monstros (ver server/src/index.js: /hunt/state, campo
  // `pack`) — única fonte de verdade pra currentPack/currentMonster desde
  // esta auditoria. Atualiza ANTES do log de contra-ataque abaixo, pra usar o
  // nome do alvo já correto.
  if (G.hunting && res.pack) applyServerPack(res.pack);
  // Contra-ataque REAL do monstro (Marco 5/6b, agora sem preview inventado):
  // se o HP caiu desde a última reconciliação (e não foi level-up, que já
  // restaura o HP cheio acima), foi o monstro da frente que bateu de verdade.
  // O NÚMERO vem do delta real; o elemento (spellTag) é só flavor cosmético,
  // reconstruído a partir do bestiário estático do alvo (ver monsterAttack).
  if (!leveledUp && G.hunting && currentMonster && s.hp != null && prevPlayerHp != null && s.hp < prevPlayerHp) {
    const dmg = prevPlayerHp - s.hp;
    const monDef = MONSTERS[currentMonster.defKey];
    const preview = monDef ? monsterAttack(monDef, getDef()) : null;
    const elKey = preview ? MONSTER_ELEMENT_KEYS[preview.element] : null;
    const spellTag = preview && preview.kind === 'spell' ? t('hunt.logElementTag', { element: elKey ? t(elKey) : preview.element }) : '';
    emit(EVENTS.LOG, t('log.monsterHitsYou', { name: currentMonster.name, dmg, spellTag }));
    emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true, spellElement: preview && preview.kind === 'spell' ? preview.element : null });
  }
  // Evento de morte REAL (Marco 6b) — nenhuma simulação local grava mais
  // gold/xp/loot/relic (ver doCosmeticTick); quem alimenta o log de kill, o
  // Hunt Analyzer, o Battle Pass, as missões, os contadores de bestiário/
  // task e o desbloqueio de zona/tier do Boss Rush é o ÚLTIMO kill real que o
  // servidor reporta aqui (server/src/huntEngine.js: session.lastKill).
  if (res.lastKill && res.lastKill.at && res.lastKill.at > lastSeenKillAt) {
    lastSeenKillAt = res.lastKill.at;
    applyServerKillEvents(res.lastKill);
  }
  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);
}

// Compara o pack recém-lido do servidor com o snapshot do poll anterior
// (prevPackByUid) pra derivar, SEM simular nada: quem apareceu agora (uid
// novo), quem levou dano de verdade (hp caiu no mesmo uid) e quem morreu (uid
// que sumiu). É isto que substitui o antigo doHuntTick spawnando/atacando seu
// próprio monstro fake — currentPack/currentMonster passam a ser um espelho
// exato de session.currentPack (ver server/src/huntEngine.js).
function applyServerPack(pack) {
  const wasEmpty = prevPackByUid.size === 0;
  // uid do alvo da frente ANTES deste diff — se ele estiver entre os que
  // sumiram agora, é ele quem acabou de morrer (dispara o flash "☠️ nome" no
  // monster-display, ver ui/huntPanel.js: renderMonsterDisplay(killed)).
  const oldFrontUid = currentMonster ? String(currentMonster.uid) : null;
  const newUids = pack.filter(m => !prevPackByUid.has(String(m.uid)));
  if (newUids.length) {
    if (wasEmpty) {
      const first = pack[0];
      const extra = pack.length > 1 ? t('hunt.logExtraInRoom', { count: pack.length - 1 }) : '';
      emit(EVENTS.LOG, isBossOnlyHunt()
        ? t('hunt.logBossTierAppeared', { icon: monsterLogIcon(first.defKey), name: first.name, tier: (G.bossTiers[G.activeZone] || 1) })
        : t('hunt.logMonsterAppeared', { icon: monsterLogIcon(first.defKey), name: first.name }) + extra);
    } else {
      newUids.forEach(m => emit(EVENTS.LOG, t('hunt.logMonsterAppeared', { icon: monsterLogIcon(m.defKey), name: m.name })));
    }
  }
  pack.forEach(m => {
    const prev = prevPackByUid.get(String(m.uid));
    if (prev && m.hp < prev.hp) {
      m._hitAt = Date.now(); // flash de dano na Battle List/palco (ver ui/huntPanel.js)
      emit(EVENTS.LOG, t('log.basicAttack', { label: t('hunt.logBasicHit'), dmg: prev.hp - m.hp, name: m.name }));
    }
  });
  const nowUids = new Set(pack.map(m => String(m.uid)));
  let killedFrontDefKey = null;
  for (const [uid, prev] of prevPackByUid) {
    if (!nowUids.has(uid)) {
      const deadEntry = { defKey: prev.defKey, name: prev.name, maxHp: prev.maxHp, uid: ++deadSeq };
      recentDead.push(deadEntry);
      setTimeout(() => { recentDead = recentDead.filter(d => d.uid !== deadEntry.uid); emit(EVENTS.BATTLE_LIST); }, 1000);
      if (manualTargetUid === uid) manualTargetUid = null;
      if (uid === oldFrontUid) killedFrontDefKey = prev.defKey;
    }
  }
  prevPackByUid = new Map(pack.map(m => [String(m.uid), { defKey: m.defKey, name: m.name, hp: m.hp, maxHp: m.maxHp }]));
  currentPack = pack;
  currentMonster = (manualTargetUid && pack.find(m => String(m.uid) === manualTargetUid)) || pack[0] || null;
  emit(EVENTS.MONSTER_DISPLAY, killedFrontDefKey ? { killed: killedFrontDefKey } : {});
  emit(EVENTS.BATTLE_LIST);
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
  reconcileEpoch++; // invalida qualquer poll pendente da caçada/pausa ANTERIOR (ver reconcileEpoch)
  huntSession = newHuntSession(); // zera o Hunt Analyzer a cada nova caçada
  // Sala/alvo/estado de diff zerados — o servidor é quem decide quando o
  // próximo grupo aparece (ver server/src/huntEngine.js: tick/nextSpawnAt);
  // o cliente só reflete isso via applyServerPack() no próximo reconcile.
  currentMonster = null;
  currentPack = [];
  prevPackByUid = new Map();
  manualTargetUid = null;
  recentDead = [];
  emit(EVENTS.HUNT_BUTTON, { hunting: true });
  emit(EVENTS.HUNT_STATS);
  emit(EVENTS.MONSTER_DISPLAY, {}); // limpa o alvo e liga o modo "procurando"
  huntInterval = setInterval(doCosmeticTick, Math.max(400, 2400 / getSpd()));
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

  // Enquanto o /hunt/start ainda não voltou, o servidor pode responder
  // /hunt/state com hunting:false por uma fração de segundo (a sessão ANTIGA
  // já fechou — ver stopHunt() logo abaixo, chamado por selectZone() antes de
  // startHunt() — mas a NOVA ainda não existe). Sem `starting`, um reconcile
  // que caísse exatamente nesse intervalo confundia isso com "a caçada atual
  // morreu", mostrava a morte da sessão ANTERIOR (de outra zona, com o
  // monstro errado) e derrubava o loop local da caçada NOVA que tinha acabado
  // de começar — bug reportado pelo Felipe: trocar de hunt e aparecer "morri"
  // pro bicho da hunt antiga. sessionId (abaixo) é uma segunda blindagem: só
  // aceita um last_death se ele pertencer à sessão que ESTE cliente iniciou.
  starting = true;
  currentSessionId = null;
  startHuntSession(buildHuntSnapshot()).then(res => {
    starting = false;
    if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ Caçada não confirmada pelo servidor: ${res.error}`, type: 'error' }); return; }
    currentSessionId = res.sessionId || null;
    reconcileWithServer(); // não espera o 1º intervalo de RECONCILE_MS pra puxar o estado real
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
  currentSessionId = res.sessionId || null;
  beginLocalLoop();
  emit(EVENTS.LOG, t('hunt.logEnterZone', { icon: '⚔️', zone: t(ZONES[G.activeZone] ? ZONES[G.activeZone].name : G.activeZone) }));
  return true;
}

// Zera todo o estado local de caçada (loop cosmético, polling, sala/alvo) sem
// chamar /hunt/stop — usado quando o SERVIDOR já encerrou a sessão por conta
// própria (morte real, ver reconcileWithServer acima), pra não mandar um stop
// redundante numa sessão que já não existe mais lá.
function stopHuntLocalOnly() {
  reconcileEpoch++; // invalida qualquer poll ainda em voo desta caçada (ver reconcileEpoch)
  G.hunting = false;
  currentSessionId = null;
  starting = false;
  if (huntInterval) { clearInterval(huntInterval); huntInterval = null; }
  if (reconcileInterval) { clearInterval(reconcileInterval); reconcileInterval = null; }
  currentMonster = null;
  currentPack = [];
  prevPackByUid = new Map();
  manualTargetUid = null;
  recentDead = [];
  emit(EVENTS.HUNT_BUTTON, { hunting: false });
  emit(EVENTS.BATTLE_LIST);
}

export function stopHunt() {
  stopHuntLocalOnly();
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

// Tick cosmético — SÓ ANIMAÇÃO/FLAVOR, na cadência antiga (400-2400ms/spd),
// pra manter a sensação de ritmo de combate entre um poll e outro do
// reconcile. Não decide mais NADA de real: não spawna, não calcula dano, não
// mata ninguém, não toca currentPack/currentMonster.hp. Essa era a raiz do
// bug (Marco de auditoria desta sessão): o combate "de verdade" já era 100%
// servidor-autoritativo desde o Marco 6b, mas o monstro MOSTRADO na tela
// ainda vinha de spawnMonsterInstance() rodando aqui, com seu próprio RNG,
// então o bicho que o jogador via lutar/morrer não tinha NENHUMA relação com
// o que o servidor matava e pagava (evidência ao vivo: "Blue Container
// appeared!" na tela enquanto o servidor creditava kills de "Chayenne",
// "Rotworm", "Scar Tribe Shaman" nunca mostrados). Agora currentPack/
// currentMonster são só um espelho de session.currentPack (ver
// applyServerPack, alimentado por reconcileWithServer) — este tick só finge
// o SWING (golpe básico) e a TENTATIVA de magia/runa por prioridade (pros
// logs/efeitos de "casting" ficarem vivos), sem aplicar nenhum dano.
export function doCosmeticTick() {
  if (!G.hunting || !G.activeZone || !currentMonster) return;
  const voc = VOC_TRAINING[G.vocation];
  const primary = currentMonster;

  // (1) Golpe básico — só ANIMAÇÃO (swing + projétil); o número real de dano
  // já foi (ou será) logado por applyServerPack() comparando o hp real entre
  // dois polls, então aqui NÃO emitimos linha de log nem tocamos primary.hp.
  const outOfAmmo = voc.attackSkill === 'distance' && isConsumeAmmo() && !((G.inventory[G.equipment.ammo] || 0) > 0);
  emit(EVENTS.PLAYER_BATTLE_SIDE, { attacking: true });
  emit(EVENTS.MONSTER_DISPLAY, { hit: true });
  if (!outOfAmmo) {
    const missile = basicAttackMissile({ attackSkill: voc.attackSkill, weaponId: G.equipment.weapon, ammoId: G.equipment.ammo });
    if (missile) emit(EVENTS.COMBAT_PROJECTILE, { missile, targetUid: String(primary.uid || primary.defKey) });
  }

  // (2) Tentativa de magia/runa por prioridade — mesma fila do RTC real (ver
  // domain/rtcConfig.js), só pra decidir SE e QUAL efeito/linha de "casting"
  // mostrar (flavor visual, sem gastar mana/consumir item/aplicar dano — isso
  // é 100% resolvido pelo servidor, ver server/src/huntEngine.js: resolveTick).
  // Os cooldowns aqui são só ESTIMATIVAS pra não repetir a mesma magia toda
  // hora na tela; podem divergir por um tick do cooldown real do servidor
  // sem problema, já que não concedem nem gastam nada de verdade.
  const magic = getMagic();
  if (isAttackGroupReady()) {
    const healSpellIdForReserve = G.rtc.healSpell || defaultHealSpellId(G.vocation, G.level);
    const healSpellForReserve = isSpellAvailable(healSpellIdForReserve, G.vocation, G.level) ? SPELLS[healSpellIdForReserve] : null;
    const healManaReserve = healSpellForReserve ? healSpellForReserve.mana : 0;
    const ready = normalizeAttackSpells(G.rtc).map(entry => {
      if (isRuneEntry(entry)) {
        const id = runeEntryId(entry);
        const rune = ITEMS[id];
        const ok = rune && canUseAttackRune(id, G.vocation, magic) && (G.inventory[id] || 0) > 0;
        return ok ? { kind: 'rune', id, rune } : null;
      }
      const s = SPELLS[entry];
      const ok = s && isSpellAvailable(entry, G.vocation, G.level) && G.mana - healManaReserve >= s.mana && isSpellReady(entry);
      return ok ? { kind: 'spell', id: entry, s } : null;
    }).filter(Boolean);
    let pick = null;
    if (ready.length) {
      pick = ready[0];
      if (G.rtc.smartElement) {
        const elOf = e => e.kind === 'rune' ? (e.rune.element || 'physical') : e.s.element;
        pick = ready.reduce((best, cur) =>
          elementMod(primary.defKey, elOf(cur)) > elementMod(primary.defKey, elOf(best)) ? cur : best, ready[0]);
      }
    }
    if (pick && pick.kind === 'rune') {
      const rune = pick.rune;
      const areaId = rune.area || 'single';
      startAttackGroupCd();
      emit(EVENTS.LOG, { html: t('log.rtcRuneUsed', { name: rune.name }), cat: 'suprimento' });
      emit(EVENTS.COMBAT_FX, { effect: runeEffectName(pick.id), shape: areaId, targetUid: primary.uid });
    } else if (pick && pick.kind === 'spell') {
      const atkSpellId = pick.id, atkSpell = pick.s;
      startSpellCd(atkSpellId, atkSpell.cd);
      startAttackGroupCd();
      emit(EVENTS.LOG, { html: t('log.spellCast', { words: atkSpell.words }), cat: 'magia' });
      emit(EVENTS.COMBAT_FX, { effect: spellEffectName(atkSpellId, atkSpell.element), shape: atkSpell.area || 'single', targetUid: primary.uid });
    }
  }

  // RTC — flash cosmético de cura (ver applyRtcHealing/startRegen). HP/mana
  // reais só mudam via reconcileWithServer().
  applyRtcHealing();
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
  // doCosmeticTick não roda (retorna cedo sem currentMonster) — sem isto o
  // jogador podia emendar pra próxima luta sem vida mesmo com a cura
  // automática ligada. Enquanto há um monstro na frente, quem cuida da cura é
  // o próprio doCosmeticTick. Roda num
  // intervalo PRÓPRIO de 500ms (não junto do regen de 2s acima) pra respeitar
  // de verdade o exhaust de 1s da poção — preso ao tick de 2s, o intervalo
  // real entre poções virava 2s (ou mais) em vez do 1s combinado.
  if (rtcHealInterval) clearInterval(rtcHealInterval);
  rtcHealInterval = setInterval(() => {
    if (G.vocation && !currentMonster) applyRtcHealing();
  }, 500);
}
