// O motor de caçada: iniciar/parar, o tick de combate, resolução de morte,
// ganho de XP e regeneração passiva. É o caso de uso mais movimentado do
// jogo — mantém o estado efêmero de combate (monstro atual, intervalos)
// encapsulado aqui, exposto só por getCurrentMonster() pra quem precisar
// (ex.: usar uma runa de ataque no inventário).
import { G, ACCOUNT } from './gameStore.js?v=230';
import { startHuntSession, stopHuntSession, getHuntState, idleHealOnServer, setHuntTarget, updateHuntRtc, getAccessToken } from '../infrastructure/authClient.js?v=235';
import { conectarRealtime, desconectarRealtime, realtimeAtivo } from '../infrastructure/realtimeClient.js?v=235';
import { ZONES } from '../domain/bestiary.js?v=248';
import { VOCATIONS, VOC_TRAINING, XP_TABLE } from '../domain/character.js?v=257';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../domain/spells.js?v=228';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId } from '../domain/rtcConfig.js?v=260';
import { monsterAttack } from '../domain/combatFormulas.js?v=259';
import { elementMod } from '../domain/elements.js?v=226';
import { STAMINA_MAX } from '../domain/stamina.js?v=226';
import { ITEMS } from '../domain/items.js?v=241';
import { MONSTERS } from '../domain/bestiary.js?v=248';
import { RARITY_TIERS } from '../domain/rarity.js?v=227';
import { spellEffectName, spellMissileName, runeEffectName, runeMissileName, basicAttackMissile } from '../domain/combatFx.js?v=228';
import { emit, on, EVENTS } from '../shared/eventBus.js?v=228';
import { getDef, getMagic, getMaxHp, getMaxMana, getSpd } from './stats.js?v=227';
import { checkBpTier, bumpMissionProgress } from './battlePassUseCases.js?v=227';
import { saveGame } from './saveGameUseCase.js?v=230';
import { isStaminaEnabled, isConsumeAmmo, getProjectileSpeedMs } from './adminUseCases.js?v=231';
import { itemLogIcon, monsterLogIcon } from './logIcons.js?v=229';
import { t } from '../i18n/i18n.js?v=244';

// Rótulo (chave i18n) do elemento da magia do monstro, pro log de combate.
const MONSTER_ELEMENT_KEYS = { fire: 'log.elementFire', energy: 'log.elementEnergy', ice: 'log.elementIce', earth: 'log.elementEarth', death: 'log.elementDeath', holy: 'log.elementHoly', physical: 'log.elementPhysical' };

let huntInterval = null;
let regenInterval = null;
let rtcHealInterval = null;
let idleHealInterval = null;
let idleHealBusy = false;
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
  // Avisa o SERVIDOR pra mirar esse alvo de verdade (golpe básico/magia) — antes
  // o clique só mudava o destaque visual e o servidor seguia batendo na frente
  // (M2). Silencioso se falhar: o próximo reconcile/tick ainda usa o último alvo
  // aceito, e o realce local já mudou na hora.
  setHuntTarget(ACCOUNT.activeSlot, key).catch(() => {});
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
// Foi caindo de 5000 -> 1500 -> 750 -> 375 -> 250, cada vez pra "não parecer
// travado". A medição (scripts/perf-hunt.mjs) mostrou que a partir de certo
// ponto isso PIOROU o problema em vez de resolver: uma resposta de /hunt/state
// levava ~1,9s, então pedir a cada 250ms deixava ~8 requisições em voo ao mesmo
// tempo. O navegador só abre 6 conexões por host, o resto entra na fila, e a
// tela passava a mostrar um estado de vários SEGUNDOS atrás — exatamente a
// sensação de travado que se queria evitar.
//
// A resposta certa não era pedir mais vezes, era a resposta chegar rápido (ver
// server/src/index.js: as leituras do /hunt/state agora vão em paralelo e o
// token fica em cache). Com ~350ms de resposta, 600ms de intervalo dá folga
// pra nunca empilhar — e o servidor só muda de estado a cada 2s (TICK_MS),
// então pedir mais que isso não revela nada de novo.
const RECONCILE_MS = 600;
// Trava de "uma de cada vez": mesmo com o intervalo folgado, um blip de rede
// pode fazer uma resposta demorar mais que RECONCILE_MS. Sem esta trava as
// requisições voltam a empilhar exatamente como antes — o intervalo sozinho
// não garante nada, só o guard garante.
let reconcileEmVoo = false;
// Cadência do poll quando o canal de tempo real está de pé.
const POLL_COM_SOCKET_MS = 5000;
let ultimoPollLento = 0;
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
// Sequência do último evento de combate já logado (ver server/src/huntEngine.js:
// pushCombat / /hunt/state combatEvents). O servidor reporta o dano/cura REAL de
// cada ação; renderCombatEvents loga cada um com o valor NA MESMA LINHA da ação
// (pedido do Felipe). Reseta a cada início de caçada (o servidor zera combatSeq).
let lastCombatSeq = 0;
// Sequência da última MORTE já creditada (fila killEvents, ver server/src/
// huntEngine.js: pushKill). Substitui o antigo lastSeenKillAt de UM único kill:
// um tick de área/pack pode matar vários no mesmo tick e TODOS precisam ser
// creditados (contadores/bestiário/tasks/Battle Pass/loot). Reseta a cada caçada.
let lastKillSeq = 0;
// Mesma ideia de lastSeenKillAt, pro evento de morte (ver server/src/
// huntEngine.js: resolveTick — hp<=0 agora encerra a sessão de verdade e
// grava stats.last_death, em vez de reviver em silêncio e seguir caçando).
let lastSeenDeathAt = 0;
// Salvaguarda MÁXIMA pro golpe ficar pendente esperando o pouso real do
// projétil (ver COMBAT_PROJECTILE_LANDED abaixo) — só dispara se o evento de
// pouso nunca chegar (painel fora de foco/não montado). Em uso normal quem
// decide o instante da queda de vida é o transitionend real, não este timer.
// Escala com a velocidade configurada no Admin (ver getProjectileSpeedMs) —
// um valor fixo quebraria a causalidade real pra qualquer velocidade mais
// lenta que ele (o fallback dispararia ANTES do projétil realmente chegar).
function hitSyncFallbackMs() {
  return getProjectileSpeedMs() + 150;
}
// golpes reais aguardando o projétil correspondente "pousar" de verdade na
// tela (ver ui/huntPanel.js: playProjectile) antes de aplicar a queda de
// vida/log — hitId -> callback. Ver applyServerPack().
let hitSeq = 0;
const pendingHits = new Map();
on(EVENTS.COMBAT_PROJECTILE_LANDED, ({ hitId } = {}) => {
  const cb = pendingHits.get(hitId);
  if (cb) { pendingHits.delete(hitId); cb(); }
});
// Efeito visual de magia/runa "pendente": doCosmeticTick decide o cast e guarda
// aqui { effect, shape, missile, at }; applyServerPack consome no próximo
// poll com queda de HP, mostrando o efeito SINCRONIZADO com o dano real (ver
// applyServerPack) em vez de disparar na hora, no relógio do tick local.
let pendingSpellFx = null;
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
// Janela de tolerância logo após um /hunt/start confirmado — um poll de
// /hunt/state pode legitimamente responder hunting:false por uma fração de
// segundo mesmo DEPOIS do servidor já ter confirmado a sessão (ex.: o
// /character/starter-kit disparado por selectVocation ainda em voo, gravando
// equipamento/inventário ao mesmo tempo; ou qualquer lag de leitura logo após
// a escrita). Sem essa tolerância, essa ÚNICA leitura falsa-negativa já
// bastava pra reconcileWithServer() interpretar como "a caçada morreu" e
// desligar tudo — bug reportado pelo Felipe: personagem novo clica Start
// Hunt, a hunt confirma no servidor (ver rede: /hunt/start retorna ok:true),
// mas a tela volta pra "Start Hunt" sozinha ~1s depois.
let startGraceUntil = 0;
const START_GRACE_MS = 2000;

// Desde o Marco 4, nível/skills/equipamento NÃO são mais enviados — o
// servidor lê de player_stats/player_skills/player_equipment (autoritativos).
// Só vocação/zona/mundo continuam vindo do cliente (ver authClient.js:
// startHuntSession).
function buildHuntSnapshot() {
  // rtc (prioridade de magia/runa, limiares de cura) é só PREFERÊNCIA — sem
  // risco de forjar valor, o servidor sempre valida mana/cooldown/posse do
  // item na hora de usar (ver server/src/huntEngine.js). Travado pra sessão
  // inteira: mudar o RTC no meio da caçada só vale a partir da próxima.
  // prey vai junto porque a caçada inteira é resolvida no servidor: sem isto
  // o bônus de presa não existia de fato (o jogador via o "+40% XP" na tela e
  // não recebia nada). O servidor não confia na FORÇA declarada — recalcula a
  // porcentagem pela raridade (ver huntEngine.js: preyBonus).
  return { slot: ACCOUNT.activeSlot, zoneId: G.activeZone, bossOnly, vocation: G.vocation, world: G.currentWorld, rtc: G.rtc, prey: G.prey || [], fightMode: G.fightMode || 'balanced', density: G.density || 'normal', bossTier: bossOnly ? ((G.bossTiers && G.bossTiers[G.activeZone]) || 1) : 1 };
}

// Estilo de Luta (Fight Mode do TFS, ver domain/combatFormulas: FIGHT_MODES) —
// Ofensivo / Equilibrado / Defensivo. Botões na janela de batalha (index.html).
// Persiste no save; caçando, reinicia a sessão pra o servidor aplicar o novo
// modo (via buildHuntSnapshot). Sem modo escolhido = 'balanced'.
const FIGHT_MODE_IDS = ['attack', 'balanced', 'defense'];
// Estilo de luta e densidade são PREFERÊNCIA: mudar não pode interromper a
// caçada em andamento (o Felipe reclamou de a hunt pausar ao trocar). O servidor
// aceita os dois ao vivo em /hunt/rtc — o estilo passa a valer no próximo golpe
// e a densidade na próxima leva de monstros. Antes era stopHunt()+startHunt(),
// que além de pausar abria uma sessão nova e zerava a sala.
function syncPrefsToServer() {
  if (G.hunting) updateHuntRtc(ACCOUNT.activeSlot, G.rtc, G.fightMode, G.density || 'normal');
}

export function setFightMode(mode) {
  if (!FIGHT_MODE_IDS.includes(mode)) return;
  if (G.fightMode !== mode) {
    G.fightMode = mode;
    saveGame();
    syncPrefsToServer();
  }
  renderFightModeButtons();
}
export function renderFightModeButtons() {
  const active = G.fightMode || 'balanced';
  document.querySelectorAll('.fight-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === active));
}

// Controle de DENSIDADE (ver server/src/huntEngine.js: packSize) — Solo (1 por
// vez) / Normal (tamanho natural) / Pack (grupo dobrado: mais XP/h, mais
// perigo). Mesmo padrão do Fight Mode: persiste no save e reinicia a caçada pra
// o servidor aplicar (buildHuntSnapshot). Botões na janela de batalha.
const DENSITY_IDS = ['solo', 'normal', 'pack'];
export function setDensity(mode) {
  if (!DENSITY_IDS.includes(mode)) return;
  if ((G.density || 'normal') !== mode) {
    G.density = mode;
    saveGame();
    syncPrefsToServer();   // vale a partir da PRÓXIMA leva, sem cortar a atual
  }
  renderDensityButtons();
}
export function renderDensityButtons() {
  const active = G.density || 'normal';
  document.querySelectorAll('.density-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === active));
}

// Loga os eventos de combate REPORTADOS pelo servidor (dano/cura real por ação),
// cada um com o valor NA MESMA LINHA da ação. Substitui a inferência antiga (que
// derivava o dano do delta de HP e logava a magia/cura em linha separada, sem
// número). A barra de vida continua animando por applyServerPack; aqui é só o log.
function renderCombatEvents(events) {
  if (!Array.isArray(events)) return;
  for (const ev of events) {
    if (!ev || ev.seq == null || ev.seq <= lastCombatSeq) continue;
    lastCombatSeq = ev.seq;
    if (ev.kind === 'basic') {
      emit(EVENTS.LOG, t('log.basicAttack', { label: t('hunt.logBasicHit'), dmg: ev.amount, name: ev.target }));
    } else if (ev.kind === 'spell') {
      // magia + dano na MESMA linha (reusa o formato de log.basicAttack com um rótulo de magia).
      emit(EVENTS.LOG, { html: t('log.basicAttack', { label: `🗣️ "${ev.label}"`, dmg: ev.amount, name: ev.target }), cat: 'magia' });
      emit(EVENTS.PLAYER_BATTLE_SIDE, { cast: { kind: 'attack', element: ev.element, label: ev.label } });
    } else if (ev.kind === 'dotcast') {
      // Magia de dano contínuo: a linha do CAST anuncia o total que a criatura
      // ainda vai tomar; os pedaços caem depois, um por linha ('dot').
      emit(EVENTS.LOG, { html: `🗣️ "${ev.label}" → ${ev.target} (${ev.amount} ao longo do tempo)`, cat: 'magia' });
    } else if (ev.kind === 'dot') {
      emit(EVENTS.LOG, { html: `🩸 ${ev.target}: ${ev.amount}`, cat: 'magia' });
    } else if (ev.kind === 'heal') {
      emit(EVENTS.LOG, { html: `💚 "${ev.label}" +${ev.amount}`, cat: 'magia' });
      // Gesto de conjurar cura no boneco (ver ui/characterPanel.js).
      emit(EVENTS.PLAYER_BATTLE_SIDE, { cast: { kind: 'heal', label: ev.label } });
    } else if (ev.kind === 'potion') {
      // Suprimentos: a janela ficava vazia porque o servidor consumia a poção
      // sem avisar ninguém (queixa do Felipe: "janela de suprimentos não é
      // preenchida com as poções usadas no combate").
      const nome = ITEMS[ev.item] ? ITEMS[ev.item].name : ev.item;
      emit(EVENTS.LOG, { html: `🧪 ${nome} +${ev.amount} ${ev.vital === 'mana' ? 'mana' : 'HP'}`, cat: 'suprimento' });
      emit(EVENTS.PLAYER_BATTLE_SIDE, { potion: ev.item, vital: ev.vital });
    } else if (ev.kind === 'monsterhit') {
      const elKey = MONSTER_ELEMENT_KEYS[ev.element];
      const spellTag = (ev.element && ev.element !== 'physical') ? t('hunt.logElementTag', { element: elKey ? t(elKey) : ev.element }) : '';
      emit(EVENTS.LOG, t('log.monsterHitsYou', { name: ev.monster, dmg: ev.amount, spellTag }));
      emit(EVENTS.PLAYER_BATTLE_SIDE, { hit: true, spellElement: ev.element !== 'physical' ? ev.element : null });
    }
  }
}

async function reconcileWithServer() {
  // Já tem um poll esperando resposta: sair sem disparar outro. Empilhar
  // requisições não traz o estado mais rápido — só enche a fila de conexões do
  // navegador e ATRASA todas elas (ver o comentário de RECONCILE_MS).
  if (reconcileEmVoo) return;
  // Com o socket entregando, o poll vira só rede de segurança: 1x a cada 5s em
  // vez de ~1,7x por segundo. É aqui que o volume de requisições cai de fato —
  // o socket sozinho só melhoraria a latência. O poll não é DESLIGADO porque é
  // ele que traz gold/XP (que não vêm no push) e que reconcilia se o socket
  // silenciar sem fechar.
  const agora = Date.now();
  if (realtimeAtivo() && agora - ultimoPollLento < POLL_COM_SOCKET_MS) return;
  ultimoPollLento = agora;
  reconcileEmVoo = true;
  const myEpoch = reconcileEpoch;
  let res;
  try { res = await getHuntState(ACCOUNT.activeSlot); }
  finally { reconcileEmVoo = false; }
  // Descarta resposta atrasada de um poll disparado numa caçada que já foi
  // parada/reiniciada nesse meio-tempo (ver comentário de reconcileEpoch).
  if (myEpoch !== reconcileEpoch) return;
  aplicarEstadoDoServidor(res, myEpoch);
}

// Aplica um estado vindo do servidor. Chamado pelos DOIS caminhos: o poll
// (reconcileWithServer) e o push do WebSocket. Ter uma função só é o que
// impede os dois divergirem — duas cópias desta lógica seria garantia de que
// o jogo se comportaria diferente conforme o socket estivesse de pé ou não.
// `res` pode ser COMPLETO (resposta do /hunt/state) ou PARCIAL (push do
// WebSocket, que traz só o que muda a cada tick — hp, mana, sala, eventos).
// Por isso toda atribuição abaixo checa presença antes de escrever: sem isso,
// um push sem gold zeraria o gold do jogador na tela.
function aplicarEstadoDoServidor(res, myEpoch) {
  if (myEpoch !== reconcileEpoch) return;
  if (!res.ok || !res.stats) return;
  const s = res.stats;
  const leveledUp = s.level != null && s.level > G.level;
  // HP de ANTES desta reconciliação — comparado com s.hp depois de aplicado,
  // é o que decide se o monstro real da frente acabou de bater no jogador
  // (ver applyServerPack mais abaixo). Preview local não inventa mais esse
  // número: ou vem de um contra-ataque de verdade já refletido em s.hp, ou
  // não é logado.
  const prevPlayerHp = G.hp;
  if (s.gold != null) G.gold = s.gold;
  if (s.xp != null) G.xp = s.xp;
  if (s.level != null) G.level = s.level;
  if (s.total_gold_earned != null) G.totalGoldEarned = s.total_gold_earned;
  if (s.total_kills != null) G.totalKills = s.total_kills;
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
  if (G.hunting && !res.hunting && !starting && Date.now() > startGraceUntil) {
    const d = s.last_death;
    // Só mostra/reage à morte se ela pertence à sessão QUE ESTE CLIENTE
    // acha que está rodando agora (currentSessionId, ver startHunt) — sem
    // isso, uma morte real da hunt ANTERIOR (já substituída) podia ser
    // exibida como se fosse da atual, com o monstro errado.
    const realDeath = d && d.at && d.at > lastSeenDeathAt && d.sessionId && d.sessionId === currentSessionId;
    if (realDeath) {
      lastSeenDeathAt = d.at;
      G.lastSeenDeathAt = d.at; // persiste no save (ver checkAndResumeHuntSession) pra não reexibir esta morte num reload futuro
      emit(EVENTS.LOG, t('hunt.logYouDied', { monster: d.monster, xpLost: d.xpLost }));
      emit(EVENTS.NOTIFY, { msg: t('hunt.notifyYouDied', { monster: d.monster, xpLost: d.xpLost }), type: 'error' });
      saveGame();
      stopHuntLocalOnly(); // morte de verdade → encerra a caçada
    } else {
      // Sessão sumiu no servidor SEM morte: ele REINICIOU (deploy/reboot) ou
      // houve um blip de rede — não foi o jogador que parou nem morreu. Em vez
      // de parar a caçada sozinha (bug reportado: "caçada parando sozinho"),
      // recria a sessão em silêncio e segue caçando de onde parou.
      tryResumeServerSession();
    }
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
  // Soul vem JA calculado do servidor (ele aplica a regeneracao pelo relogio).
  if (s.soul != null) { G.soul = s.soul; G.soulAt = Date.now(); }
  if (s.soul_max != null) G.soulMax = s.soul_max;
  // Skills (Marco 4) — o motor de combate treina server-side (huntEngine.js:
  // trainSkill), mas nada devolvia esse progresso: G.sk ficava travado no
  // valor local do save, sem nunca ser corrigido pelo real do servidor.
  if (res.skills) { G.sk = res.skills; emit(EVENTS.TRAINING_PANEL); emit(EVENTS.CHAR_PANEL); }
  // A sala REAL de monstros (ver server/src/index.js: /hunt/state, campo
  // `pack`) — única fonte de verdade pra currentPack/currentMonster desde
  // esta auditoria. Atualiza ANTES do log de contra-ataque abaixo, pra usar o
  // nome do alvo já correto.
  if (G.hunting && res.pack) applyServerPack(res.pack);
  // Log de combate SERVER-TRUTH: dano do golpe básico, dano da magia/runa (na
  // MESMA linha da magia), cura (na linha da magia de cura) e contra-ataque do
  // monstro — cada um com o VALOR REAL reportado pelo servidor (ver pushCombat).
  // Substitui a inferência antiga por delta de HP (que logava a magia/cura sem
  // número, em linha separada). A barra de vida continua animando via
  // applyServerPack; isto aqui é só o texto do log.
  if (G.hunting) renderCombatEvents(res.combatEvents);
  // Mortes REAIS (Marco 6b) — nenhuma simulação local grava gold/xp/loot/relic
  // (ver doCosmeticTick); quem alimenta o log de kill, o Hunt Analyzer, o Battle
  // Pass, as missões, os contadores de bestiário/task e o tier do Boss Rush são
  // os kills que o servidor reporta na FILA killEvents (server/src/huntEngine.js:
  // pushKill). Processa TODAS as novas (seq > lastKillSeq) — um tick de área/pack
  // mata vários de uma vez e cada morte tem que ser creditada UMA vez (H1: antes,
  // com o lastKill único, só o ÚLTIMO morto contava e o resto sumia).
  if (Array.isArray(res.killEvents) && res.killEvents.length) {
    for (const k of res.killEvents) {
      if (k.seq == null || k.seq <= lastKillSeq) continue;
      lastKillSeq = k.seq;
      lastSeenKillAt = k.at || lastSeenKillAt;
      applyServerKillEvents(k);
    }
  } else if (res.lastKill && res.lastKill.at && res.lastKill.at > lastSeenKillAt) {
    // Fallback pra servidor antigo (ainda sem killEvents) durante o rollout.
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
  // Blindagem: um monstro em hp<=0 já está morto — nunca deve entrar na sala
  // viva (o servidor já filtra em /hunt/state, isto é a rede de segurança).
  // Sem isto, um alvo em hp:0 (pego num estado intermediário do servidor)
  // aparecia "vivo com 0/110 e sendo atacado" no cliente.
  pack = (pack || []).filter(m => m.hp > 0);
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
  // Golpes reais (hp caiu desde o poll anterior) — a QUEDA na barra de vida
  // (e o flash/linha de log que a acompanham) só é aplicada quando o
  // projétil cosmético (ver ui/huntPanel.js: playProjectile) TERMINA DE
  // VOAR DE VERDADE (transitionend, via COMBAT_PROJECTILE_LANDED com hitId
  // casado), em vez de um timeout chutado sem relação causal com a animação
  // — isso fecha de vez a dessincronia (ver comentário em doCosmeticTick).
  // currentPack abaixo preserva o hp ANTIGO até o projétil chegar.
  pack.forEach(m => {
    const uid = String(m.uid);
    const prev = prevPackByUid.get(uid);
    if (prev && m.hp < prev.hp) {
      const dmg = prev.hp - m.hp;
      const hitId = String(++hitSeq);
      const voc = VOC_TRAINING[G.vocation];
      const missile = basicAttackMissile({ attackSkill: voc.attackSkill, weaponId: G.equipment.weapon, ammoId: G.equipment.ammo });
      const applyHit = () => {
        const vis = currentPack.find(cm => String(cm.uid) === uid);
        if (vis) { vis.hp = m.hp; vis._hitAt = Date.now(); }
        // Solta o efeito da magia AQUI, no mesmo quadro em que a vida cai.
        // Medido antes disto: mediana de 405ms e pior caso de 1371ms entre o
        // fogo aparecer e o dano chegar — dois relógios diferentes. Ficou
        // visível quando o efeito passou a cair em cima da criatura.
        // A janela de 3s descarta efeito velho (o cast pode não ter causado
        // dano nenhum: errou, morreu antes, ou o alvo já estava morto).
        if (pendingSpellFx && Date.now() - pendingSpellFx.at < 3000) {
          const fx = pendingSpellFx;
          pendingSpellFx = null;
          emit(EVENTS.COMBAT_FX, fx);
        }
        // O LOG do dano do jogador agora vem dos combatEvents server-truth
        // (renderCombatEvents), com o valor por AÇÃO (básico vs magia). Aqui só
        // a animação da barra/flash quando o projétil pousa.
        emit(EVENTS.BATTLE_LIST);
        emit(EVENTS.MONSTER_DISPLAY, {});
      };
      if (missile) {
        pendingHits.set(hitId, applyHit);
        emit(EVENTS.COMBAT_PROJECTILE, { missile, targetUid: uid, hitId });
        // salvaguarda: se o evento de pouso nunca chegar (painel não montado
        // ainda, aba trocada), não deixa o golpe pendente pra sempre.
        setTimeout(() => { if (pendingHits.delete(hitId)) applyHit(); }, hitSyncFallbackMs());
      } else {
        applyHit();
      }
    }
  });
  const nowUids = new Set(pack.map(m => String(m.uid)));
  let killedFrontDefKey = null, killedFrontUid = null;
  for (const [uid, prev] of prevPackByUid) {
    if (!nowUids.has(uid)) {
      const deadEntry = { defKey: prev.defKey, name: prev.name, maxHp: prev.maxHp, uid: ++deadSeq };
      recentDead.push(deadEntry);
      setTimeout(() => { recentDead = recentDead.filter(d => d.uid !== deadEntry.uid); emit(EVENTS.BATTLE_LIST); }, 1000);
      if (manualTargetUid === uid) manualTargetUid = null;
      if (uid === oldFrontUid) { killedFrontDefKey = prev.defKey; killedFrontUid = uid; }
    }
  }
  // Projétil do golpe FATAL no alvo da frente: o loop de dano acima (pack.forEach)
  // só dispara projétil pra quem SOBREVIVE (hp caiu, ainda no pack). Quando o
  // golpe MATA de primeira, o alvo sai do pack e cai aqui — sem isto, todo golpe
  // que abate o monstro num tiro só ficava SEM a seta/projétil (bug do Felipe:
  // "às vezes o projétil não sai"). O alvo ainda está no DOM neste instante
  // (o re-render só vem no emit MONSTER_DISPLAY abaixo), então a seta voa até ele.
  if (killedFrontUid) {
    const voc = VOC_TRAINING[G.vocation];
    const missile = basicAttackMissile({ attackSkill: voc.attackSkill, weaponId: G.equipment.weapon, ammoId: G.equipment.ammo });
    if (missile) emit(EVENTS.COMBAT_PROJECTILE, { missile, targetUid: killedFrontUid });
  }
  // Reconstrói currentPack: quem já existia mantém o hp ANTIGO (o setTimeout
  // acima corrige assim que o golpe "chega") — só quem acabou de aparecer
  // agora usa o hp real de cara, já que não há golpe nenhum pra sincronizar ainda.
  const oldByUid = new Map(currentPack.map(cm => [String(cm.uid), cm]));
  prevPackByUid = new Map(pack.map(m => [String(m.uid), { defKey: m.defKey, name: m.name, hp: m.hp, maxHp: m.maxHp }]));
  currentPack = pack.map(m => {
    const old = oldByUid.get(String(m.uid));
    return old ? { ...m, hp: old.hp, _hitAt: old._hitAt } : { ...m };
  });
  currentMonster = (manualTargetUid && currentPack.find(m => String(m.uid) === manualTargetUid)) || currentPack[0] || null;
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

  emit(EVENTS.LOG, t('log.monsterDied', { name: k.monster, xp: k.xp || 0 }));
  // O gold entra na linha de LOOT (junto com os itens), não na linha de morte —
  // é como o Tibia mostra ("Loot of a wolf: 3 gold coins, a wolf paw") e é o que
  // faz a aba Loot do log bater com o que você realmente ganhou. Antes ele
  // aparecia grudado no XP, numa aba onde não dava pra conferir ganho.
  const lootParts = [];
  if (k.gold) lootParts.push(t('log.lootGold', { gold: k.gold }));
  (k.loot || []).forEach(id => lootParts.push(`${itemLogIcon(id)} ${(ITEMS[id] && ITEMS[id].name) || id}`));
  if (lootParts.length) {
    emit(EVENTS.LOG, { html: t('log.lootLine', { items: lootParts.join(', ') }), cat: 'loot' });
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
  lastCombatSeq = 0; // o servidor zera combatSeq a cada startSession (ver pushCombat)
  lastKillSeq = 0;   // idem killSeq (ver pushKill) — nova sessão recomeça do zero
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
  // Sem o clearInterval abaixo, chamar beginLocalLoop() duas vezes sem um
  // stopHuntLocalOnly() no meio (ex.: clique duplo em "Start Hunt" antes do
  // botão re-renderizar, ou checkAndResumeHuntSession seguido de um start
  // manual) deixava o huntInterval ANTIGO vazando, rodando em paralelo com o
  // novo — cada um chamando doCosmeticTick() por conta própria, cada chamada
  // criando seu PRÓPRIO projétil (ver playProjectile: cria um <img> novo por
  // evento, sem deduplicar). Resultado: várias flechas/bolas de fogo na tela
  // ao mesmo tempo em vez de uma só (bug reportado pelo Felipe). Mesmo
  // padrão já usado abaixo pro reconcileInterval.
  if (huntInterval) clearInterval(huntInterval);
  huntInterval = setInterval(doCosmeticTick, Math.max(400, 2400 / getSpd()));
  if (reconcileInterval) clearInterval(reconcileInterval);
  reconcileInterval = setInterval(reconcileWithServer, RECONCILE_MS);
  // Canal de tempo real: entrega o tick no instante em que ele acontece. O
  // poll acima CONTINUA rodando — é ele que garante o estado se o socket cair,
  // e é ele que traz gold/XP, que não vêm no push.
  conectarRealtime(ACCOUNT.activeSlot, getAccessToken, res => aplicarEstadoDoServidor(res, reconcileEpoch));
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
    startGraceUntil = Date.now() + START_GRACE_MS;
    reconcileWithServer(); // não espera o 1º intervalo de RECONCILE_MS pra puxar o estado real
  });
}

// Retoma a sessão de caçada no servidor quando ela sumiu SEM morte (o servidor
// reiniciou por deploy/reboot, ou houve um blip de rede — ver
// reconcileWithServer). Recria a sessão em silêncio e mantém o loop local
// rodando, então o jogador NÃO percebe a interrupção, em vez de a caçada
// "parar sozinha". Throttle de 3s pra não martelar o servidor enquanto ele
// ainda está subindo — se falhar, o próximo reconcile tenta de novo.
let lastResumeAt = 0;
function tryResumeServerSession() {
  if (starting || Date.now() - lastResumeAt < 3000) return;
  lastResumeAt = Date.now();
  starting = true;
  currentSessionId = null;
  startHuntSession(buildHuntSnapshot()).then(res => {
    starting = false;
    if (res && res.ok) {
      currentSessionId = res.sessionId || null;
      startGraceUntil = Date.now() + START_GRACE_MS;
      // A sessão NOVA do servidor recomeça combatSeq/killSeq do zero (ver
      // startSession). Sem zerar os cursores do cliente aqui, renderCombatEvents
      // ignorava todo evento com seq <= o high-water da sessão ANTIGA e o log de
      // combate ficava MUDO até o seq novo ultrapassá-lo (M4). Reseta ambos.
      lastCombatSeq = 0;
      lastKillSeq = 0;
    }
  }).catch(() => { starting = false; });
}

// Chamado UMA VEZ no boot (ver main.js: bootGame), antes de applyOfflineProgress().
// O servidor de caçada continua tickando sozinho mesmo com a aba fechada (ver
// server/src/huntEngine.js) — se a sessão ainda está ativa lá, o tempo fechado
// JÁ foi contado de verdade pelo servidor; rodar TAMBÉM o cálculo aproximado de
// applyOfflineProgress contaria a mesma janela duas vezes. Retorna true se
// retomou (quem chamou deve pular o applyOfflineProgress local nesse caso).
export async function checkAndResumeHuntSession() {
  if (!G.vocation) return false;
  // G.hunting ainda reflete o save (local/nuvem) de ANTES deste boot — se veio
  // true, é porque a aba fechou/travou no meio de uma caçada. Precisa ser lido
  // AQUI, antes de resetar pra false logo abaixo, pra decidir se um possível
  // last_death encontrado é "morreu enquanto a aba estava fechada" (avisa) ou
  // só o resquício de uma sessão já normalmente encerrada antes (não avisa de
  // novo — ver o uso de wasHuntingLocally mais abaixo).
  const wasHuntingLocally = G.hunting;
  G.hunting = false; // só fica true de novo se o servidor confirmar sessão viva
  const res = await getHuntState(ACCOUNT.activeSlot);
  if (!res.ok) return false;
  // Sincroniza SEMPRE (parado ou caçando) — antes só chamava reconcileWithServer
  // quando havia uma sessão pra retomar; parado, G.gold/xp/level/hp/mana ficavam
  // com o que estivesse no save (local ou nuvem), por mais desatualizado que
  // estivesse, e o cálculo aproximado de applyOfflineProgress rodava em cima
  // desse valor já errado, compondo o erro a cada boot.
  await reconcileWithServer();
  if (!res.hunting) {
    // Cliente achava (pelo save) que ainda estava caçando, mas o servidor já
    // não está mais — ou o jogador morreu com a aba fechada (server encerrou
    // a sessão de verdade, ver server/src/huntEngine.js: resolveTick) ou algo
    // mais parou a caçada nesse meio-tempo sem o cliente saber. Se houver um
    // last_death mais novo que o já visto, avisa agora — sem isso, reabrir o
    // jogo depois de morrer offline não mostrava NADA sobre o que aconteceu
    // (bug reportado pelo Felipe: tela ficava fora de sincronia sobre
    // caçando/morto). G.lastSeenDeathAt é persistido no save (ao contrário de
    // lastSeenDeathAt em memória, que reseta a cada load) pra nunca reexibir
    // a MESMA morte de novo num reload futuro.
    const d = res.stats && res.stats.last_death;
    if (wasHuntingLocally && d && d.at && d.at > (G.lastSeenDeathAt || 0)) {
      G.lastSeenDeathAt = d.at;
      lastSeenDeathAt = d.at;
      emit(EVENTS.LOG, t('hunt.logYouDied', { monster: d.monster, xpLost: d.xpLost }));
      emit(EVENTS.NOTIFY, { msg: t('hunt.notifyYouDied', { monster: d.monster, xpLost: d.xpLost }), type: 'error' });
      saveGame();
    }
    return false;
  }
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
  desconectarRealtime();
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
  // Log de "casting" da cura — só estimativa de cooldown (mesmo espírito do
  // ataque em doCosmeticTick), sem gastar mana/curar de verdade aqui (isso é
  // 100% resolvido pelo servidor). Sem isso a aba "Magias" do log de combate
  // nunca mostrava a cura acontecendo, só o ataque (bug reportado: "não
  // parece que tá usando magia de cura").
  if (spellWants && isSpellReady(healSpellId)) {
    startSpellCd(healSpellId, healSpell.cd);
    // O log da cura (com o VALOR curado) agora vem dos combatEvents server-truth
    // (renderCombatEvents) — antes logava só "casting" sem número, em linha à parte.
  }
}

// RTC parado (fora de caçada) — cura de VERDADE (spell/poção), não só o flash
// cosmético de applyRtcHealing acima. Dentro de uma caçada quem cura de
// verdade é o tick do servidor (huntEngine.js: applyRtcHealing); fora dela
// não existia NADA rodando pro jogador se curar sozinho antes da próxima
// hunt — só dava pra beber poção manualmente pela Bag (pedido do Felipe: "nao
// faz sentido eu nao curar antes de entrar numa batalha"). Chamada por um
// timer próprio (ver startRegen: idleHealInterval), só quando NÃO caçando —
// o servidor valida tudo de novo (posse/vocação/nível), igual usePotionStandalone.
async function performIdleRtcHeal() {
  if (!G.rtc || !G.vocation || idleHealBusy) return;
  const maxHp = getMaxHp(), maxMana = getMaxMana();
  const hpPct = maxHp > 0 ? (G.hp / maxHp) * 100 : 100;
  const manaPct = maxMana > 0 ? (G.mana / maxMana) * 100 : 100;
  const wantsHp = G.hp > 0 && (
    (G.rtc.healPotion && hpPct < (G.rtc.healPotionThreshold || 0) && ((G.inventory && G.inventory[G.rtc.healPotion]) || 0) > 0) ||
    hpPct < (G.rtc.healSpellThreshold || 0)
  );
  const wantsMana = G.rtc.manaPotion && G.mana < maxMana && manaPct < (G.rtc.manaPotionThreshold || 0) && ((G.inventory && G.inventory[G.rtc.manaPotion]) || 0) > 0;
  if (!wantsHp && !wantsMana) return;
  idleHealBusy = true;
  try {
    const res = await idleHealOnServer(ACCOUNT.activeSlot, G.rtc);
    if (!res.ok) return;
    // Parado, a vida/mana só SOBEM (regen passiva + poção). Math.max evita que
    // o valor do servidor (calculado do seu próprio updated_at, às vezes 1 poll
    // atrás) puxe pra baixo o que a regen LOCAL (startRegen) já mostrou —
    // causava o HP "tremer" (43→42→45) parado (bug pego no probe de morte).
    G.hp = Math.max(G.hp, res.hp);
    G.mana = Math.max(G.mana, res.mana);
    if (res.usedPotionHeal && G.rtc.healPotion) {
      G.inventory[G.rtc.healPotion] = Math.max(0, (G.inventory[G.rtc.healPotion] || 0) - 1);
      emit(EVENTS.LOG, { html: `${itemLogIcon(G.rtc.healPotion)} ${t('inventory.logHealHp', { item: ITEMS[G.rtc.healPotion].name, amount: res.healedHp })}`, cat: 'suprimento' });
    }
    if (res.usedPotionMana && G.rtc.manaPotion) {
      G.inventory[G.rtc.manaPotion] = Math.max(0, (G.inventory[G.rtc.manaPotion] || 0) - 1);
      emit(EVENTS.LOG, { html: `${itemLogIcon(G.rtc.manaPotion)} ${t('inventory.logHealMana', { item: ITEMS[G.rtc.manaPotion].name, amount: res.healedMana })}`, cat: 'suprimento' });
    }
    if (res.healedHp > 0 || res.healedMana > 0) {
      emit(EVENTS.BARS);
      emit(EVENTS.HEADER_STATS);
      emit(EVENTS.INVENTORY);
      saveGame();
    }
  } finally {
    idleHealBusy = false;
  }
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
  emit(EVENTS.PLAYER_BATTLE_SIDE, { attacking: true });
  emit(EVENTS.MONSTER_DISPLAY, { hit: true });
  // O projétil em si NÃO dispara mais aqui — este tick roda no SEU próprio
  // timer local (400-2400ms/spd), sem relação nenhuma com o instante em que
  // o reconcile (a cada 250ms) percebe um golpe real. Disparar o voo daqui e
  // a queda de vida de applyServerPack() por um timeout separado eram dois
  // relógios independentes só coincidindo por sorte de tuning — daí a
  // sincronia nunca ficar boa por mais que o delay fosse ajustado. Agora o
  // projétil só voa quando applyServerPack() confirma um golpe real, e a
  // vida só cai quando esse voo específico termina (ver COMBAT_PROJECTILE_LANDED).

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
      // Log (com dano) vem dos combatEvents server-truth; aqui só o visual.
      // No Tibia a runa VOA do conjurador até o alvo antes de estourar (o
      // CONST_ANI_* de cada script) — antes só aparecia o estouro parado em
      // cima do monstro, e runa nenhuma tinha projétil.
      const runeMissile = runeMissileName(pick.id);
      if (runeMissile) emit(EVENTS.COMBAT_PROJECTILE, { missile: runeMissile, targetUid: String(primary.uid || primary.defKey) });
      // GUARDA em vez de emitir agora: o efeito sai junto com a queda de vida
      // confirmada pelo servidor (ver applyServerPack). Emitir aqui é o relógio
      // do tick LOCAL, que corre solto do dano real.
      pendingSpellFx = { effect: runeEffectName(pick.id), shape: areaId, targetUid: primary.uid, at: Date.now() };
    } else if (pick && pick.kind === 'spell') {
      const atkSpellId = pick.id, atkSpell = pick.s;
      startSpellCd(atkSpellId, atkSpell.cd);
      startAttackGroupCd();
      // Log (com dano) vem dos combatEvents server-truth; aqui só o efeito/projétil.
      const missile = spellMissileName(atkSpellId);
      if (missile) {
        // Ethereal Spear/Strong Ethereal Spear: joga uma lança de verdade
        // (ver domain/combatFx.js: SPELL_MISSILE) em vez do efeito de área.
        emit(EVENTS.COMBAT_PROJECTILE, { missile, targetUid: String(primary.uid || primary.defKey) });
      } else {
        pendingSpellFx = { effect: spellEffectName(atkSpellId, atkSpell.element), shape: atkSpell.area || 'single', targetUid: primary.uid, at: Date.now() };
      }
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
    // SÓ regenera HP/mana LOCALMENTE quando PARADO — e isso NÃO quer dizer que
    // caçando não há regeneração: durante a caça quem regenera é o SERVIDOR, a
    // cada tick (ver huntEngine.js: regenVitals), e o cliente só espelha o valor
    // que vem no reconcile (a cada 250ms). Somar aqui também faria o HP/mana
    // TREMEREM pra cima e caírem a cada poll (M5).
    if (!G.hunting) {
      G.hp = Math.min(getMaxHp(), G.hp + v.hpRegen * 3);
      G.mana = Math.min(getMaxMana(), G.mana + v.manaRegen * 3);
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

  // Cura de VERDADE enquanto parado (fora de caçada) — ver performIdleRtcHeal.
  // Intervalo mais longo que o flash cosmético acima de propósito: respeita o
  // exhaust real de poção (~1s) sem precisar de estado de cooldown persistido
  // no servidor (ver server/src/huntEngine.js: idleRtcHealStandalone).
  if (idleHealInterval) clearInterval(idleHealInterval);
  idleHealInterval = setInterval(() => {
    if (G.vocation && !G.hunting) performIdleRtcHeal();
  }, 1000);
}
