// Motor de caçada AUTORITATIVO.
//
// Marco 2: cada kill é decidido por ESTE processo, rodando sozinho, contra o
// relógio real do servidor. Marco 3: loot + relíquias. Marco 4: atk/def/spd
// vêm de player_stats/player_skills/player_equipment. Marco 5: combate real
// (magia/runa por prioridade RTC, cura, contra-ataque, morte, treino de
// skill). Marco 6: respingo de área (pack de monstros, não só alvo único),
// bênçãos e stamina autoritativas — fecha as 3 limitações que ainda
// restavam (documentadas antes, agora corrigidas).
import { ZONES, MONSTERS, boostedZoneForDate, boostedCreatureForDate, boostedBossForDate, BOSS_MONSTER_IDS, bossTierMultiplier } from '../../src/domain/bestiary.js?v=147';
import {
  spawnMonsterInstance, computeMaxHp, computeMaxMana,
  computeAtk, computeDef, equippedWeaponSkillId, spellAttackDamage, spellHealAmount, runeDamage, potionRestore,
  rollPlayerAttack, rollMonsterMelee, rollMonsterSpell, reducePhysical, computePlayerArmor, computePlayerDefense,
  computePlayerAbsorb, reduceElemental,
} from '../../src/domain/combatFormulas.js?v=159';
import { worldXpMultiplier, worldGoldMultiplier } from '../../src/domain/progression.js?v=128';
import { zoneMultiplier, resolveMonsterLoot, resolveZoneSpawn } from '../../src/domain/adminConfig.js?v=128';
import { XP_TABLE, MAX_LEVEL, VOC_TRAINING, applySkillGain, VOCATIONS, PROMOTION } from '../../src/domain/character.js?v=156';
import { ITEMS, EQUIPPABLE_TYPES, equippableFallbackPool, canUsePotion, resolveEquippedItem } from '../../src/domain/items.js?v=139';
import { SHOP_ITEMS, isBoostActive } from '../../src/domain/shopCatalog.js?v=128';
import { CHARMS } from '../../src/domain/charms.js?v=128';
import { RARITY_TIERS, rollIndependentRarityTiers } from '../../src/domain/rarity.js?v=126';
import { SPELLS, isSpellAvailable, defaultHealSpellId } from '../../src/domain/spells.js?v=127';
import { canUseAttackRune, normalizeAttackSpells, isRuneEntry, runeEntryId, pickHealTier, pickTarget, orderByPackSize } from '../../src/domain/rtcConfig.js?v=159';
import { elementMod } from '../../src/domain/elements.js?v=125';
import { deathXpLossPct, reviveHpPct, MAX_BLESSINGS } from '../../src/domain/blessings.js?v=125';
import { areaMaxTargets, isAreaAttack } from '../../src/domain/attackAreas.js?v=125';
import { buildDotSchedule } from '../../src/domain/dotDamage.js?v=125';
import { preyBonusPct, PREY_MAX_RARITY } from '../../src/domain/prey.js?v=125';
import { staminaXpMult } from '../../src/domain/stamina.js?v=125';
import { activeImbuementFor } from '../../src/domain/imbuements.js?v=125';
import { QUESTS } from '../../src/domain/quests.js?v=1';
import { getGameConfig } from './gameConfig.js';
import { selectOne, selectMany, selectLatest, insertRow, upsertRow, updateRows, deleteRows, callRpc } from './db.js';
import { acquireUserLock } from './econLock.js';
import { temOuvinte, empurrar } from './realtime.js';

// sessionId -> objeto de sessão (ver startSession) — tudo em memória; só
// existe enquanto ESTE processo está de pé (ver reapStaleSessionsOnBoot).
const live = new Map();
// Índice por personagem (userId:slot). Sem ele, descobrir se um jogador tem
// caçada viva exigia consultar hunt_sessions — uma ida ao banco em TODO poll
// de /hunt/state, que é a rota mais chamada do jogo. Varrer o `live` inteiro
// também não serve: com milhares de sessões seria O(n) por requisição.
const porPersonagem = new Map();
const chaveSlot = (userId, slot) => userId + ':' + slot;

export function getLiveSessionBySlot(userId, slot) {
  const s = porPersonagem.get(chaveSlot(userId, slot));
  return s && !s.stopped ? s : null;
}

const ATTACK_GROUP_CD_MS = 2000;
const POTION_CD_MS = 1000;
// Cadência de ataque FIEL ao Crystal Server: o tick roda numa batida fixa de 2s (a
// velocidade de ataque de arma padrão do Tibia, ~2000ms — NÃO escala com
// spd/haste, que no Tibia é só movimento). A cada tick o jogador dá um golpe,
// o monstro dá um melee, e — independente do melee, como no Crystal Server — tenta uma
// magia com MONSTER_SPELL_CHANCE. Antes o tick escalava por spd e o monstro
// fazia "50% melee OU 50% magia" (um ou outro), o que não é o Crystal Server.
const TICK_MS = 2000;
const MONSTER_SPELL_CHANCE = 0.5;
// Folga entre um monstro spawnar e poder contra-atacar — dá tempo do cliente
// (poll de /hunt/state a cada 250ms) mostrar "X appeared!" na tela antes de
// qualquer risco de dano real (ver tick()/resolveTick abaixo).
const SPAWN_GRACE_MS = 1500;

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
// Armadura (peças de corpo) e defesa (escudo) do jogador — separadas, fiéis ao
// Crystal Server (Player::getArmor / Player::getDefense), usadas na redução de dano físico
// que o jogador SOFRE (Creature::blockHit, ver rollMonsterAttack + reducePhysical).
function getPlayerArmor(session) {
  return computePlayerArmor(session.equipment, session.relics);
}
function getPlayerDefense(session) {
  return computePlayerDefense({ skills: session.skills, equipment: session.equipment, relics: session.relics, fightMode: session.fightMode });
}
// Resistência elemental do jogador (% de absorção por elemento, das peças
// equipadas) — fiel ao Crystal Server (Item::getAbsorbPercent). Reduz o dano elemental
// que o jogador SOFRE das magias do monstro (ver reduceElemental no contra-
// ataque). Lida fresca a cada tick pra respeitar troca de equipamento na caçada.
function getPlayerAbsorb(session) {
  return computePlayerAbsorb(session.equipment, session.relics, session.imbuements);
}

// Registra um evento de combate com o VALOR REAL (dano/cura) pra o cliente logar
// — o dano da magia e a cura vão na MESMA linha da ação (pedido do Felipe), em
// vez de o cliente inferir do delta de HP e logar em linha separada. Ring buffer
// de ~40; o cliente pega os com seq maior que o último que renderizou (ver
// /hunt/state: combatEvents). kind: 'basic'|'spell'|'heal'|'monsterhit'.
function pushCombat(session, ev) {
  if (!session.combatEvents) { session.combatEvents = []; session.combatSeq = 0; }
  ev.seq = ++session.combatSeq;
  session.combatEvents.push(ev);
  if (session.combatEvents.length > 40) session.combatEvents.shift();
}

// Fila de KILLS (seq'd, mesma ideia do pushCombat). Um tick de ÁREA/pack pode
// matar VÁRIOS monstros no MESMO tick; com um único session.lastKill o cliente
// só creditava o ÚLTIMO — contadores de kill, bestiário, tasks, Battle Pass e o
// log de loot subcontavam (deaths-1) a cada multi-kill. Agora cada morte entra
// na fila e o cliente processa TODAS as novas (ver huntUseCases: lastKillSeq).
// hp/mana são colunas INTEGER no banco. Qualquer fração (regen ocioso, cura
// parcial) faz o upsert devolver 400 e, como settleKill grava ANTES de registrar
// a morte, a criatura morria sem creditar XP/gold/loot e sem linha no log. Esta
// é a rede de segurança: tudo que vai pro banco passa por aqui.
const vitalInt = v => Math.max(0, Math.round(Number(v) || 0));

function pushKill(session, k) {
  if (!session.killEvents) { session.killEvents = []; session.killSeq = 0; }
  k.seq = ++session.killSeq;
  session.killEvents.push(k);
  if (session.killEvents.length > 20) session.killEvents.shift();
}

// Resolve a magia de cura EFETIVA do RTC. Usa a escolhida pelo jogador, mas se
// ela não está disponível pro nível atual, CAI no default apropriado pro nível
// (defaultHealSpellId já é level-aware: Bruise Bane/Magic Patch < 8, exura/
// exura_ico >= 8). Sem esse fallback, um save gravado por um cliente stale (que
// tinha o defaultHealSpellId antigo, sempre 'exura' de nível 8) deixava um char
// de Dawnport (nível 1-7) com healSpell='exura' INDISPONÍVEL → não curava nunca
// (bug reportado pelo Felipe: "magias de cura de Dawnport não curam"). O servidor
// é autoritativo na cura, então corrigir aqui conserta independente do cliente.
function resolveHealSpell(healSpellId, vocation, level) {
  let id = healSpellId || defaultHealSpellId(vocation, level);
  if (!isSpellAvailable(id, vocation, level)) id = defaultHealSpellId(vocation, level);
  return { id, spell: isSpellAvailable(id, vocation, level) ? SPELLS[id] : null };
}

// Exportada (também usada por index.js: rotas do Market, pra decrementar/
// devolver item ao inventário do vendedor/comprador) — mesmo padrão de
// read-then-write já usado por toda mutação de player_inventory neste
// arquivo.
// --- INVENTÁRIO EM MEMÓRIA (só durante a caçada) -------------------------
// O tick lia o banco 3x por batida só pra saber quantas poções/runas o jogador
// tem — e o tick roda a cada 2s, por jogador. Com 100 caçando isso é ~150
// leituras por segundo no Supabase, cada uma um HTTP do Railway: é o teto de
// escala do jogo hoje, muito antes da CPU.
//
// A sessão passa a carregar o inventário uma vez e manter em memória. Toda
// mutação continua indo pro banco na hora (nada de lote — loot perdido num
// crash seria pior que a latência), mas agora sem o read-antes-do-write: como
// já sabemos a quantidade atual, o upsert vai direto.
export function sessionQty(session, itemId) {
  return (session.inv && session.inv[itemId]) || 0;
}

// Mutação DENTRO da caçada: mexe na memória e escreve, em 1 ida em vez de 2.
export async function changeSessionInv(session, itemId, delta) {
  const atual = sessionQty(session, itemId);
  const novo = Math.max(0, atual + delta);
  if (!session.inv) session.inv = {};
  session.inv[itemId] = novo;
  await upsertRow('player_inventory', { user_id: session.userId, slot: session.slot, item_id: itemId, qty: novo, updated_at: new Date().toISOString() }, 'user_id,slot,item_id');
  return novo;
}

// Compra/venda/mercado acontecem FORA do tick e escrevem direto no banco. Se
// houver uma caçada viva do mesmo personagem, o cache dela precisa saber —
// senão o jogador compra poção caçando e o RTC continua achando que não tem.
function espelharNoLive(userId, slot, itemId, novaQty) {
  const sess = porPersonagem.get(chaveSlot(userId, slot));
  if (!sess) return;
  if (!sess.inv) sess.inv = {};
  sess.inv[itemId] = novaQty;
}

export async function incrementInventory(userId, slot, itemId, delta) {
  // ATÔMICO no banco (função increment_inventory: qty = GREATEST(0, qty+delta) num
  // único UPDATE com lock de linha). Antes era select-then-upsert e o tick de loot
  // (settleKill, roda FORA do ECON lock) corria com as rotas HTTP de inventário
  // (shop/imbue/market, DENTRO do lock): dois escritores no mesmo item duplicavam ou
  // perdiam a quantidade. A bag não tem teto de tipos (mesma regra do cliente).
  const newQty = Number(await callRpc('increment_inventory', { p_user: userId, p_slot: slot, p_item: itemId, p_delta: delta }));
  espelharNoLive(userId, slot, itemId, newQty);
  return newQty;
}

// Concede os rewards de uma task no SERVIDOR (server-authoritative), pra o resgate
// deixar de ser client-side e evaporar no reconcile (#1/#6). Trata xp (com recálculo
// de nível igual à morte), gold e item/randomItem em player_stats/player_inventory.
// taskCoin fica no cliente (não está em ECONOMY_FIELDS -> o reconcile não o reverte).
// Chamado pelo /task/complete, que está no mutex ECON (serializa com o flush, #R2).
export async function grantTaskRewardsServer(userId, slot, rewards) {
  let addXp = 0, addGold = 0;
  const grantedItems = [];
  for (const r of rewards || []) {
    if (!r) continue;
    if (r.type === 'xp') addXp += Math.max(0, Number(r.amount) || 0);
    else if (r.type === 'gold') addGold += Math.max(0, Number(r.amount) || 0);
    else if (r.type === 'item' && ITEMS[r.itemId]) {
      const q = Math.max(1, Number(r.qty) || 1);
      const newQty = await incrementInventory(userId, slot, r.itemId, q);
      grantedItems.push({ itemId: r.itemId, qty: newQty });
    } else if (r.type === 'randomItem') {
      const pool = (r.itemIds || []).filter(id => ITEMS[id]);
      if (pool.length) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const newQty = await incrementInventory(userId, slot, picked, 1);
        grantedItems.push({ itemId: picked, qty: newQty });
      }
    }
    // taskCoin: creditado no cliente (persiste no save; não é revertido pelo reconcile).
  }
  // Se está caçando, a SESSÃO é dona do xp/level/gold — drena o pendente dela pra
  // player_stats primeiro (padrão da morte), aplica o reward absoluto, e ressincroniza
  // a sessão pra o próximo flush não regredir o nível. Estamos no mutex ECON
  // (/task/complete), então flushVitals(live, true) não re-adquire o lock (#R2).
  const live = getLiveSessionBySlot(userId, slot);
  if (live) await flushVitals(live, true);
  const stats = await selectOne('player_stats', { user_id: userId, slot });
  let gold = (stats ? Number(stats.gold) || 0 : 0) + addGold;
  const totalGoldEarned = (stats ? Number(stats.total_gold_earned) || 0 : 0) + addGold;
  let level = stats ? Number(stats.level) || 1 : 1;
  let xp = stats ? Number(stats.xp) || 0 : 0;
  if (addXp > 0) {
    let resto = XP_TABLE.slice(0, level - 1).reduce((a, b) => a + b, 0) + xp + addXp;
    let novoNivel = 1;
    while (novoNivel < MAX_LEVEL && resto >= XP_TABLE[novoNivel - 1]) { resto -= XP_TABLE[novoNivel - 1]; novoNivel++; }
    level = novoNivel; xp = resto;
  }
  await upsertRow('player_stats', { user_id: userId, slot, gold, total_gold_earned: totalGoldEarned, level, xp, updated_at: new Date().toISOString() }, 'user_id,slot');
  if (live) {
    live.level = level; live.xpAbs = xp;
    live.maxHp = computeMaxHp({ vocation: live.vocation, level, equipment: live.equipment, relics: live.relics });
    live.maxMana = computeMaxMana({ vocation: live.vocation, level });
    live.hp = Math.min(live.hp, live.maxHp); live.mana = Math.min(live.mana, live.maxMana);
  }
  return { gold, totalGoldEarned, level, xp, grantedItems };
}

// Concede/acumula um boost (xp/gold/loot/training) no SERVIDOR (server-authoritative).
// Antes o boost vivia só em G.boosts (cliente) e o /hunt/start confiava em body.boosts:
// (1) cliente adulterado forjava {xp,gold,loot: ano 3000} -> +50% permanente de graça;
// (2) boost comprado no meio da caça não valia até rezonar (a sessão guardava o
// snapshot do hunt-start). Agora grava player_stats.boosts (mapa tipo->expiraEm, ms) E
// atualiza a sessão viva, então o efeito vale NA HORA. Fontes: loja (/shop/buy-boost),
// BP (/bp/claim), arena (/boost/grant); o daily já gravava player_stats.boosts.
export async function grantBoostServer(userId, slot, boostType, minutes) {
  const stats = await selectOne('player_stats', { user_id: userId, slot });
  const boosts0 = (stats && stats.boosts && typeof stats.boosts === 'object') ? stats.boosts : {};
  const now = Date.now();
  // acumula tempo em cima do que ainda está valendo (igual à loja/daily)
  const base = isBoostActive(boosts0, boostType, now) ? boosts0[boostType] : now;
  const boosts = { ...boosts0, [boostType]: base + Math.max(0, minutes) * 60000 };
  await upsertRow('player_stats', { user_id: userId, slot, boosts, updated_at: new Date().toISOString() }, 'user_id,slot');
  const live = getLiveSessionBySlot(userId, slot);
  if (live) live.boosts = boosts;
  return boosts;
}

// --- DANO CONTÍNUO (magias "utori", ver domain/dotDamage.js) ---------------
// A sequência de golpes é montada no CAST e guardada na própria criatura, com
// horário absoluto de cada golpe. Isso tem duas consequências que são fiéis ao
// Tibia e importam aqui: o veneno continue queimando enquanto o jogador bate
// noutro alvo, e ele morra junto com a criatura (a lista vai embora com o
// corpo, não "vaza" pro próximo monstro da sala).
function attachDot(monster, spell, ctx) {
  const agora = Date.now();
  const golpes = buildDotSchedule(spell.dot, ctx);
  if (!golpes.length) return 0;
  monster.dots = (monster.dots || []).concat(
    golpes.map(g => ({ at: agora + g.atMs, damage: g.damage, element: spell.element, label: spell.words }))
  );
  return golpes.reduce((s, g) => s + g.damage, 0);
}

// Cobra os golpes de dano contínuo que venceram desde o último tick. Roda ANTES
// do golpe básico pra que uma criatura já morta pelo veneno não leve porrada
// de graça — e pra que a morte por DoT caia no mesmo settleKill de sempre.
function applyDueDots(session, pack) {
  const agora = Date.now();
  for (const mon of pack) {
    if (!mon.dots || !mon.dots.length || mon.hp <= 0) continue;
    let total = 0, label = null, element = null;
    mon.dots = mon.dots.filter(d => {
      if (d.at > agora) return true;
      total += Math.max(1, Math.floor(d.damage * elementMod(mon.defKey, d.element)));
      label = d.label; element = d.element;
      return false;
    });
    if (total > 0) {
      mon.hp -= total;
      pushCombat(session, { kind: 'dot', label, element, amount: total, target: mon.name });
    }
  }
}

// --- PRESAS (Prey) ------------------------------------------------------
// O bônus de presa vive no save (que é do cliente), então chega aqui pelo
// snapshot da caçada. Nada do que o cliente diz sobre a FORÇA do bônus é
// aceito: só lemos criatura, tipo, raridade e validade, e recalculamos a
// porcentagem pela regra do domínio. Um save adulterado com "+900% XP" vale
// exatamente o que a raridade dele permitir.
//
// Antes disto o prey era puramente decorativo: o jogador travava a criatura,
// via "+40% XP" na tela, e não recebia nada — o servidor nunca sequer ficava
// sabendo que existia uma presa (a caçada inteira é resolvida aqui).
// Soma dos value dos charms EQUIPADOS com um dado efeito (xp/gold/loot/damage/
// lifeleech). Recalculado da fonte CHARMS a cada uso — o cliente só manda os ids,
// nunca o valor (mesma blindagem do prey). Ver domain/charms.js.
function charmSum(session, effect) {
  const ids = Array.isArray(session.charms) ? session.charms : [];
  let total = 0;
  for (const id of ids) {
    const c = CHARMS[id];
    if (c && c.effect === effect) total += c.value || 0;
  }
  return total;
}

function preyBonus(session, defKey, tipo) {
  const slots = Array.isArray(session.prey) ? session.prey : [];
  const agora = Date.now();
  let melhor = 0;
  for (const s of slots) {
    if (!s || s.monster !== defKey || !(s.expires > agora)) continue;
    if (s.bonusType !== tipo) continue;
    const rarity = Math.max(1, Math.min(PREY_MAX_RARITY, Math.floor(s.rarity) || 1));
    melhor = Math.max(melhor, preyBonusPct(tipo, rarity));
  }
  return melhor;
}

function isSpellReady(session, id) { return (session.spellCdUntil[id] || 0) <= Date.now(); }
function startSpellCd(session, id, seconds) { if (seconds > 0) session.spellCdUntil[id] = Date.now() + seconds * 1000; }
function isAttackGroupReady(session) { return session.attackGroupCdUntil <= Date.now(); }
function startAttackGroupCd(session) { session.attackGroupCdUntil = Date.now() + ATTACK_GROUP_CD_MS; }

function trainSkill(session, skillId, amount, cfg) {
  if (!session.skills[skillId]) return;
  // Em Rook (vocação provisória, ainda não graduou) treina no ritmo neutro —
  // ver domain/character.js: sem isto, farmar ML como sorcerer e graduar paladin
  // levava o Magic Level alto de brinde.
  const { sk } = applySkillGain(session.skills, skillId, amount * cfg.skillRate, session.vocation, !session.graduated);
  session.skills = sk;
}

// Cura automática (spell + poções) — mesmo espírito de applyRtcHealing em
// src/application/huntUseCases.js, mas só o essencial (sem log/eventos).
async function applyRtcHealing(session, cfg) {
  const rtc = session.rtc || {};
  const hpPct = (session.hp / session.maxHp) * 100;
  // Degrau de cura: com 70/45/25 configurados e HP em 20%, casta o de 25% (a
  // cura mais forte). Um gatilho só desperdiçava mana curando arranhão ou
  // deixava morrer num pico de dano — ver domain/rtcConfig.js: pickHealTier.
  const degrau = pickHealTier(rtc, hpPct);
  const { id: healSpellId, spell: healSpell } = resolveHealSpell(degrau ? degrau.spell : null, session.vocation, session.level);
  if (healSpell && degrau && session.hp > 0 && session.mana >= healSpell.mana && isSpellReady(session, healSpellId)) {
    const heal = Math.min(session.maxHp - session.hp, spellHealAmount({ spell: healSpell, level: session.level, magicLevel: (session.skills.magic && session.skills.magic.lv) || 0 }));
    session.hp = Math.min(session.maxHp, session.hp + heal);
    session.mana -= healSpell.mana;
    startSpellCd(session, healSpellId, healSpell.cd);
    trainSkill(session, 'magic', healSpell.mana, cfg);
    if (heal > 0) pushCombat(session, { kind: 'heal', label: healSpell.words, amount: heal }); // cura NA MESMA LINHA da magia
  }

  const potionReady = Date.now() >= session.potionCdUntil;
  if (potionReady && rtc.healPotion && session.hp > 0 && ((session.hp / session.maxHp) * 100) < (rtc.healPotionThreshold || 0)) {
    const item = ITEMS[rtc.healPotion];
    if (item && canUsePotion(item, session.vocation, session.level)) {
      if (sessionQty(session, rtc.healPotion) > 0) {
        const antes = session.hp;
        session.hp = Math.min(session.maxHp, session.hp + potionRestore(item.heal));
        session.potionCdUntil = Date.now() + POTION_CD_MS;
        await changeSessionInv(session, rtc.healPotion, -1);
        // O cliente não tinha como saber que uma poção foi bebida — o servidor
        // consome, e nenhum evento saía. Sem isto não dá pra mostrar o gesto
        // nem preencher a janela de suprimentos.
        pushCombat(session, { kind: 'potion', item: rtc.healPotion, vital: 'hp', amount: session.hp - antes });
      }
    }
  }

  if (Date.now() >= session.potionCdUntil && rtc.manaPotion && session.mana < session.maxMana && ((session.mana / session.maxMana) * 100) < (rtc.manaPotionThreshold || 0)) {
    const item = ITEMS[rtc.manaPotion];
    if (item && canUsePotion(item, session.vocation, session.level)) {
      if (sessionQty(session, rtc.manaPotion) > 0) {
        const antes = session.mana;
        session.mana = Math.min(session.maxMana, session.mana + potionRestore(item.mana));
        session.potionCdUntil = Date.now() + POTION_CD_MS;
        await changeSessionInv(session, rtc.manaPotion, -1);
        pushCombat(session, { kind: 'potion', item: rtc.manaPotion, vital: 'mana', amount: session.mana - antes });
      }
    }
  }
}

// Persiste hp/mana/skills/stamina desta sessão — a cada kill e periodicamente
// (ver startSession: flushTimer), pra não perder mais que alguns segundos de
// estado se o processo cair no meio de uma luta sem matar nada.
// Grava o progresso ACUMULADO desde o último flush, numa chamada só.
//
// Por que DELTA e não valor absoluto: gold e XP têm escritores fora da caçada
// (loja, mercado, bênçãos, recompensa diária). Se gravássemos o valor absoluto
// que temos em memória, uma compra feita entre dois flushes seria SOBRESCRITA
// — o jogador perderia item e dinheiro. Com `gold = gold + delta` (ver a
// função apply_hunt_progress no banco) as duas escritas somam, em qualquer
// ordem, sem perder nenhuma. É o banco resolvendo a concorrência, que é onde
// ela deve ser resolvida.
//
// hp/mana/stamina/skills vão como valor absoluto porque a sessão é a única
// dona deles enquanto a caçada existe.
// #R2 (corrida da carteira): segura o mutex do usuário enquanto grava o progresso,
// A MENOS que o caller já o tenha (os endpoints ECON seguram o lock durante todo o
// request — ver econLock.js). Sem isto, o flush (gold = gold + delta) que caísse
// ENTRE o select e o upsert de uma compra (gold = stats.gold - custo, absoluto) era
// sobrescrito, perdendo o ganho da caçada. O flush do scheduler (tick periódico e
// stopSession) não tem lock -> `alreadyLocked=false` adquire; useItemInSession vem
// de /hunt/use-item (já no mutex) -> `true`.
async function flushVitals(session, alreadyLocked = false) {
  const release = alreadyLocked ? null : await acquireUserLock(session.userId);
  try {
    await _flushVitalsImpl(session);
  } finally {
    if (release) release();
  }
}
async function _flushVitalsImpl(session) {
  // Zera os deltas ANTES de enviar: uma morte que aconteça durante o await
  // acumula no contador novo e será gravada no flush seguinte. Se somássemos
  // depois, ela entraria duas vezes.
  const d = session.prog || (session.prog = novoProg());
  session.prog = novoProg();
  const tinhaTier = session.bossTierSujo;
  session.bossTierSujo = false;
  flushBestiaryKills(session, d.speciesKills).catch(() => {}); // fire-and-forget, próprio catch interno já devolve o delta
  try {
    await callRpc('apply_hunt_progress', {
      p_user: session.userId, p_slot: session.slot,
      d_gold: d.gold, d_xp: d.xp, d_gold_earned: d.goldEarned,
      d_kills: d.kills, d_boss_points: d.bossPoints,
      p_level: session.level,
      p_hp: vitalInt(session.hp), p_mana: vitalInt(session.mana), p_stamina: session.stamina,
      p_skills: session.skills,
      p_boss_max_tier: tinhaTier ? (session.bossMaxTier || {}) : null,
    });
  } catch (e) {
    // Devolve o que não foi gravado pro próximo flush — perder XP/gold por um
    // blip de rede seria bem pior que gravar 5s depois.
    session.prog.gold += d.gold;
    session.prog.xp += d.xp;
    session.prog.goldEarned += d.goldEarned;
    session.prog.kills += d.kills;
    session.prog.bossPoints += d.bossPoints;
    if (tinhaTier) session.bossTierSujo = true;
    console.error('flush de progresso falhou', session.id, e.message);
  }
}

function novoProg() {
  return { gold: 0, xp: 0, goldEarned: 0, kills: 0, bossPoints: 0, speciesKills: {} };
}

// Persiste o progresso de bestiário (mortes POR ESPÉCIE) acumulado desde o
// último flush em player_bestiary.state.kills — fonte de verdade real pros
// Charm Points (ver domain/charms.js: charmPointsForKills). Antes disto, a
// contagem por espécie só existia em G.killCounters no CLIENTE, então
// qualquer valor de Charm Points/charm desbloqueado podia ser forjado (achado
// da auditoria: /hunt/start aceitava `body.charms` sem checar posse contra
// nada server-side, e o charm falso já multiplicava gold/xp reais no
// combate). Read-modify-write simples (não é hot path — só roda no mesmo
// timer de 5s do flushVitals, uma vez por sessão viva).
async function flushBestiaryKills(session, deltas) {
  const ids = Object.keys(deltas);
  if (!ids.length) return;
  try {
    const row = await selectOne('player_bestiary', { user_id: session.userId, slot: session.slot });
    const kills = (row && row.state && row.state.kills) || {};
    for (const id of ids) kills[id] = (kills[id] || 0) + deltas[id];
    await upsertRow('player_bestiary', { user_id: session.userId, slot: session.slot, state: { kills }, updated_at: new Date().toISOString() }, 'user_id,slot');
  } catch (e) {
    // Mesmo espírito do catch de flushVitals: devolve os deltas pro próximo
    // flush em vez de perder a contagem por um blip de rede.
    const back = session.prog.speciesKills;
    for (const id of ids) back[id] = (back[id] || 0) + deltas[id];
    console.error('flush de bestiário falhou', session.id, e.message);
  }
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
  const todayS = todayStr();
  const isBoostedToday = session.zoneId === boostedZoneForDate(todayS);
  const boostedMult = isBoostedToday ? 1.5 : 1;
  // Boosted Creature/Boss do DIA (fiel ao Tibia: a criatura/boss em destaque no
  // dia dá 2x XP e o dobro de chance de loot). Antes só a ZONA boosted valia; a
  // criatura e o boss do dia (mostrados no boostedPanel) eram puramente
  // cosméticos — nenhum bônus era aplicado.
  const isBoostedCreature = mon.defKey === boostedCreatureForDate(todayS)
    || (session.bossOnly && mon.defKey === boostedBossForDate(todayS));
  const creatureBoostMult = isBoostedCreature ? 2 : 1;
  const staminaMult = cfg.staminaEnabled ? staminaXpMult(session.stamina) : 1;
  // Boost do JOGADOR (comprado/ganho: xp/gold/loot) + Charms equipados — antes
  // NADA disto era aplicado no combate server-authoritative (jogador pagava RC e
  // gastava pontos de charm sem efeito). Boost = +50% fixo enquanto ativo; charm
  // = soma dos value por efeito (ver domain/charms.js). Recalculado da fonte.
  const agoraTs = Date.now();
  const xpBoost = (isBoostActive(session.boosts, 'xp', agoraTs) ? 1.5 : 1) * (1 + charmSum(session, 'xp'));
  const goldBoost = (isBoostActive(session.boosts, 'gold', agoraTs) ? 1.5 : 1) * (1 + charmSum(session, 'gold'));
  const lootBoost = (isBoostActive(session.boosts, 'loot', agoraTs) ? 1.5 : 1) * (1 + charmSum(session, 'loot'));
  const goldGained = Math.floor((mon.gold[0] + Math.random() * (mon.gold[1] - mon.gold[0])) * zoneGoldMult * worldGoldMultiplier(session.world) * boostedMult * cfg.goldRate * goldBoost);
  const preyXpMult = 1 + preyBonus(session, mon.defKey, 'xp');
  const xpGained = Math.floor(mon.xp * zoneXpMult * worldXpMultiplier(session.world) * boostedMult * creatureBoostMult * cfg.xpRate * staminaMult * preyXpMult * xpBoost);

  // Progresso vai pra MEMÓRIA, não pro banco. Antes cada morte fazia 1 leitura
  // + 3 escritas no Supabase; com 10 mil jogadores isso é dezenas de milhares
  // de operações por segundo. Agora acumula em session.prog e o flush grava
  // tudo de uma vez (ver flushProgresso).
  const xpAntes = session.xpAbs;
  session.xpAbs += xpGained;
  let level = session.level;
  while (level < MAX_LEVEL && session.xpAbs >= XP_TABLE[level - 1]) {
    session.xpAbs -= XP_TABLE[level - 1];
    level++;
  }
  const leveledUp = level > session.level;
  session.level = level;
  const gold = session.goldAbs + goldGained;
  session.goldAbs = gold;
  const totalGoldEarned = session.goldEarnedAbs + goldGained;
  session.goldEarnedAbs = totalGoldEarned;
  const totalKills = session.killsAbs + 1;
  session.killsAbs = totalKills;
  const xp = session.xpAbs;
  // O delta de XP pode ser NEGATIVO quando sobe de nível (o laço acima
  // subtrai) — por isso guardamos a diferença real, não o xpGained.
  session.prog.xp += session.xpAbs - xpAntes;
  session.prog.gold += goldGained;
  session.prog.goldEarned += goldGained;
  session.prog.kills += 1;
  session.prog.speciesKills[mon.defKey] = (session.prog.speciesKills[mon.defKey] || 0) + 1;
  if (leveledUp) {
    session.maxHp = computeMaxHp({ vocation: session.vocation, level, equipment: session.equipment, relics: session.relics });
    session.maxMana = computeMaxMana({ vocation: session.vocation, level });
    session.hp = session.maxHp;
    session.mana = session.maxMana;
  }

  // Boss Zone meta: vencer o BOSS da zona numa sessão bossOnly concede boss
  // points (prestígio, escala com o tier) e registra o tier MÁXIMO por zona
  // (base do ranking de boss). Só o boss conta — não os monstros normais.
  const bossMaxTier = session.bossMaxTier || (session.bossMaxTier = {});
  if (session.bossOnly && BOSS_MONSTER_IDS.has(mon.defKey)) {
    const tier = session.bossTier || 1;
    session.bossPointsAbs += 5 * tier;
    session.prog.bossPoints += 5 * tier;
    if ((bossMaxTier[session.zoneId] || 0) < tier) { bossMaxTier[session.zoneId] = tier; session.bossTierSujo = true; }
  }
  const bossPoints = session.bossPointsAbs;

  // (sem escrita aqui: o flush a cada 5s grava o acumulado numa chamada só)

  const lootTable = resolveMonsterLoot(cfg, mon.defKey, mon.loot);
  const lootGained = [];
  // Presa de LOOT: no Tibia o bônus entra como acréscimo à chance de CADA
  // drop, não como multiplicador do total.
  const preyLoot = preyBonus(session, mon.defKey, 'loot');
  // Auto-vender lixo: 'misc' com valor de venda <= maxValue vira gold no ATO do
  // drop, sem entrar no inventário (QoL de idle — ver domain/gameState: autoSell).
  const autoSell = session.autoSell && session.autoSell.enabled ? session.autoSell : null;
  let autoSellGold = 0;
  for (const [itemId, chance] of lootTable) {
    // Boosted creature/boss dobra a chance de loot (cap em 1 = drop garantido).
    if (Math.random() < Math.min(1, chance * cfg.lootRate * creatureBoostMult * (1 + preyLoot) * lootBoost)) {
      const it = ITEMS[itemId];
      const sellVal = it && it.type === 'misc' ? (it.sell || 0) : -1;
      if (autoSell && sellVal > 0 && sellVal <= autoSell.maxValue) {
        // vendido na hora: soma no gold, NÃO entra no inventário nem em lootGained
        // (senão o cliente contaria o valor DUAS vezes — como gold e como loot).
        autoSellGold += sellVal;
      } else {
        const captured = await changeSessionInv(session, itemId, 1);
        if (captured) lootGained.push(itemId);
      }
    }
  }
  // Gold do auto-sell entra nos MESMOS acumuladores do gold da morte (já somados
  // acima), pra ir pro flush e pro crédito do cliente na linha de loot.
  if (autoSellGold > 0) {
    session.goldAbs += autoSellGold;
    session.goldEarnedAbs += autoSellGold;
    session.prog.gold += autoSellGold;
    session.prog.goldEarned += autoSellGold;
  }

  // Conta os abates da raid (gate do spawn: ondas comuns primeiro, chefe depois).
  if (session.questId) session.questKills = (session.questKills || 0) + 1;

  // Quest: vencer o CHEFE da quest concede o prêmio real do Tibia UMA vez só.
  // Server-authoritative (não confia no cliente) e não-repetível (checa a lista
  // de concluídas). Persiste a conclusão na hora — evento raro e importante.
  if (session.questId && QUESTS[session.questId] && mon.defKey === QUESTS[session.questId].boss) {
    // A raid TEM FIM: derrotar o chefe encerra a quest (para o respawn do chefe
    // e sinaliza o cliente pra voltar à zona anterior). Vale mesmo numa rejogada
    // (o prêmio abaixo é que é não-repetível).
    session.questEnded = session.questId;
    const done = session.completedQuests || (session.completedQuests = []);
    if (!done.includes(session.questId)) {
      done.push(session.questId);
      const rewardItem = QUESTS[session.questId].reward.item;
      const captured = await changeSessionInv(session, rewardItem, 1);
      if (captured) lootGained.push(rewardItem); // aparece na linha de loot
      session.questReward = rewardItem; // só na 1ª vez: o cliente mostra "Prêmio: X" (rejogada não promete prêmio)
      try {
        await upsertRow('player_stats', { user_id: session.userId, slot: session.slot, completed_quests: done, updated_at: new Date().toISOString() }, 'user_id,slot');
      } catch (e) { console.error('falha ao persistir quest concluída', session.questId, e.message); }
      session.questJustDone = session.questId; // sinal cosmético pro cliente (linha de log)
    }
  }

  const relicsGained = [];
  if (session.bossOnly && BOSS_MONSTER_IDS.has(mon.defKey) && Math.random() < cfg.relicDropChance) {
    const equippablePool = mon.loot.map(([id]) => id).filter(id => ITEMS[id] && EQUIPPABLE_TYPES.includes(ITEMS[id].type));
    // Teto do pool de fallback usa o xp BASE do catálogo (bestiário), não
    // mon.xp — que já vem multiplicado pelo tier do Boss Rush
    // (bossTierMultiplier cresce exponencial, 1.35^(tier-1)). Usar o valor
    // inflado deixava o teto de preço subir junto com o tier escolhido pelo
    // jogador, então um boss trivial (ex.: Wolf, xp base 18) em tier 2+ já
    // liberava itens caros/fora de tema do fallback geral (relatado: Wolf
    // tier 2 dropou "Siphoning Inferniarch Wand", um nome de set endgame,
    // via 43 = 18*2.43 * 5 = 215 de teto). O tier escala a DIFICULDADE da
    // luta (hp/atk/def reais), não deveria destravar tier de loot também.
    const baseMon = MONSTERS[mon.defKey];
    const pool = equippablePool.length > 0 ? equippablePool : equippableFallbackPool(baseMon ? baseMon.xp : mon.xp);
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

  const kill = { monster: mon.name, defKey: mon.defKey, gold: goldGained + autoSellGold, xp: xpGained, loot: lootGained, relics: relicsGained, at: Date.now() };
  pushKill(session, kill);
  session.lastKill = kill; // mantido por compat; o crédito real do cliente vem da fila killEvents
}

// Um "tick" inteiro: golpe básico (só no alvo da frente) + magia/runa por
// prioridade RTC — COM respingo de área real quando a magia/runa é de área
// (isAreaAttack/areaMaxTargets, ver domain/attackAreas.js) — + cura +
// contra-ataque + morte. Fiel ao doHuntTick do cliente.
async function resolveTick(session) {
  const cfg = await getGameConfig();
  // stopSession() (ver /hunt/stop) pode ter marcado esta sessão parada
  // ENQUANTO este tick esperava o await acima — sem essa checagem, um golpe
  // a mais (do jogador OU do monstro) ainda aplicava dano/gravava vitals
  // depois do jogador já ter clicado "Stop Hunt" (bug reportado: "dou stop
  // hunt e continuo levando hit"). clearInterval() só impede o PRÓXIMO tick
  // agendado, não aborta um tick já em andamento — esta é a checagem que
  // fecha essa janela.
  if (session.stopped) return;
  const voc = VOC_TRAINING[session.vocation];
  const pack = session.currentPack;
  const now = Date.now();
  decayStamina(session, cfg, now - (session.lastTickAt || now));
  session.lastTickAt = now;

  // (0) veneno/fogo/sangramento pendentes das magias de dano contínuo. Roda
  // ANTES de escolher o alvo: se o veneno acabou de matar quem estava na mira,
  // o golpe deste tick vai pro próximo da sala em vez de bater num cadáver.
  applyDueDots(session, pack);

  // Alvo do jogador: a criatura que ele escolheu na Battle List/palco (clique →
  // /hunt/target seta session.targetUid), SE ainda estiver viva na sala; senão
  // cai no primeiro da fila. Antes o servidor SEMPRE batia no pack[0] e o clique
  // do jogador não mudava nada no combate real — só o destaque visual (M2). A
  // ORDEM da sala não muda (o Felipe já reclamou de reordenar): só troca QUEM
  // leva o golpe. O contra-ataque abaixo continua vindo da frente da sala.
  // Clique do jogador na Battle List manda acima de tudo; sem clique, vale a
  // PRIORIDADE DE ALVO configurada no RTC (menor vida, mais forte, etc.).
  const primary = (session.targetUid != null && pack.find(m => String(m.uid) === String(session.targetUid) && m.hp > 0))
    || pickTarget(pack, (session.rtc || {}).targetPriority)
    || pack[0];

  // (1) golpe básico — só o alvo da frente (o básico nunca tem área, só magia/
  // runa podem ter). Dano FIEL ao Crystal Server: rola normal_random sobre a fórmula de
  // arma (WeaponMelee/Distance/Wand::getWeaponDamage) e, se físico (melee/
  // distância), o monstro reduz pela sua armadura (monster.def) via
  // reducePhysical (Creature::blockHit). Wand é elemental: não reduz por
  // armadura, só pelo modificador elemental do alvo.
  // Consumo de munição — só vocação de DISTÂNCIA e só se o Admin ligou
  // "consumeAmmo" (default é munição infinita, conveniência de idle). Arco sem
  // flecha no inventário NÃO dispara o golpe básico (fiel ao Tibia); a magia/runa
  // logo abaixo ainda pode sair. Antes o toggle existia mas o servidor o ignorava.
  let semMunicao = false;
  if (cfg.consumeAmmo && voc && voc.attackSkill === 'distance' && session.equipment && session.equipment.ammo) {
    if (sessionQty(session, session.equipment.ammo) > 0) await changeSessionInv(session, session.equipment.ammo, -1);
    else semMunicao = true;
  }
  const atkRoll = rollPlayerAttack({ vocation: session.vocation, level: session.level, skills: session.skills, equipment: session.equipment, relics: session.relics, fightMode: session.fightMode });
  let basicDmg = atkRoll.damage * elementMod(primary.defKey, atkRoll.element);
  if (atkRoll.physical) basicDmg = reducePhysical(basicDmg, primary.def, 0);
  // Presa de DANO (só contra a criatura travada) + Charm de dano (Wound/Enflame,
  // sempre ativo enquanto equipado — ver domain/charms.js). Ambos aditivos.
  basicDmg *= 1 + preyBonus(session, primary.defKey, 'damage') + charmSum(session, 'damage');
  const dealt = semMunicao ? 0 : Math.max(1, Math.floor(basicDmg));
  if (dealt > 0) {
    primary.hp -= dealt;
    pushCombat(session, { kind: 'basic', amount: dealt, target: primary.name });
  }
  // Respingo do golpe BÁSICO — só existe quando a munição tem área (Burst
  // Arrow). O golpe corpo a corpo e a flecha comum continuam alvo único.
  if (dealt > 0 && isAreaAttack(atkRoll.area) && pack.length > 1) {
    const outros = pack.filter(m => m !== primary && m.hp > 0).slice(0, areaMaxTargets(atkRoll.area) - 1);
    for (const alvo of outros) {
      let d = atkRoll.damage * elementMod(alvo.defKey, atkRoll.element);
      if (atkRoll.physical) d = reducePhysical(d, alvo.def, 0);
      alvo.hp -= Math.max(1, Math.floor(d));
    }
  }
  // Imbuement da ARMA (Tibia): Vampirism (life leech), Void (mana leech) e
  // Scorch (dano elemental extra) — aplicados sobre o dano do ataque básico se
  // o imbuement ainda vale (ver domain/imbuements.js: expiresAt). Efeito
  // resolvido aqui, no servidor autoritativo.
  const wImb = dealt > 0 ? activeImbuementFor(session.imbuements, 'weapon', now) : null;
  if (wImb) {
    const e = wImb.effect;
    if (e.type === 'lifeleech' && session.hp > 0) session.hp = Math.min(session.maxHp, session.hp + Math.max(1, Math.floor(dealt * e.pct)));
    else if (e.type === 'manaleech') session.mana = Math.min(session.maxMana, session.mana + Math.max(1, Math.floor(dealt * e.pct)));
    else if (e.type === 'elemental') primary.hp -= Math.max(1, Math.floor(dealt * e.pct * elementMod(primary.defKey, e.element)));
  }
  // Charm Vampiric: cura uma fração do dano do golpe básico (separado do imbuement
  // de arma acima — os dois somam). Recalculado da fonte (charmSum).
  const cLeech = dealt > 0 ? charmSum(session, 'lifeleech') : 0;
  if (cLeech > 0 && session.hp > 0) session.hp = Math.min(session.maxHp, session.hp + Math.max(1, Math.floor(dealt * cLeech)));
  if (dealt > 0 && voc.attackSkill !== 'magic') {
    const meleeSkillId = equippedWeaponSkillId(session.equipment, session.relics);
    trainSkill(session, meleeSkillId, meleeSkillId === 'distance' ? 2 : 1, cfg);
  }

  // (2) magia/runa por prioridade (RTC), com respingo de área real
  const rtc = session.rtc || {};
  const magic = (session.skills.magic && session.skills.magic.lv) || 0;
  const { spell: healSpellForReserve } = resolveHealSpell(rtc.healSpell, session.vocation, session.level);
  // Reserva mana de cura SÓ quando a cura está iminente (HP abaixo do gatilho de
  // cura), não o tempo todo. Antes, reservar sempre deixava o ataque caro do
  // knight (exori/Berserk, 125 mana) quase nunca disparar num knight de nível
  // baixo (mana − reserva < 125): com HP cheio ele batia só o básico. Agora, com
  // HP alto o ataque dispara livre; quando o HP cai abaixo do gatilho, a reserva
  // volta e a cura não fica sem mana. Isso casa exatamente com quando a cura de
  // fato roda (hpPct < healSpellThreshold). NÃO muda o custo canônico (125).
  const hpPctNow = session.maxHp > 0 ? (session.hp / session.maxHp) * 100 : 100;
  const healImminent = healSpellForReserve && hpPctNow < (rtc.healSpellThreshold || 0);
  const healManaReserve = healImminent ? healSpellForReserve.mana : 0;

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

    // Área ou alvo único conforme QUANTOS bichos estão vivos na sala: gastar
    // Avalanche num bicho só é jogar carga fora, e bater single target numa
    // sala cheia é perder dano. Reordena sem descartar — se não houver
    // candidato do tipo preferido, o outro continua valendo.
    const vivos = pack.filter(m => m.hp > 0).length;
    const ehArea = c => isAreaAttack(c.kind === 'rune' ? (c.rune.area || 'single') : (c.s.area || 'single'));
    const ordenados = orderByPackSize(ready, vivos, (rtc.areaMinTargets != null ? rtc.areaMinTargets : 2), ehArea);

    // Runa: precisa ESTAR no inventário de verdade (checagem live).
    let pick = null;
    for (const cand of ordenados) {
      if (cand.kind === 'spell') { pick = cand; break; }
      if (sessionQty(session, cand.id) > 0) { pick = cand; break; }
    }

    let areaId = 'single', element = null, hitFn = null;
    if (pick && pick.kind === 'rune') {
      const rune = pick.rune;
      areaId = rune.area || 'single';
      element = rune.element || 'physical';
      hitFn = () => runeDamage({ rune, level: session.level, magicLevel: magic });
      await changeSessionInv(session, pick.id, -1);
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
      // Magia de dano contínuo ("utori"): não tem `power` nem dano imediato —
      // gruda a sequência de golpes no alvo e sai. Sem este caminho, spellAttackDamage
      // recebia power undefined e o RTC quebrava ao configurar Ignite/Envenom/etc.
      if (atkSpell.dot) {
        const ctxDot = { level: session.level, magicLevel: magic, meleeSkill: Math.max(meleeSkill, distanceSkill) };
        const alvos = isAreaAttack(atkSpell.area) ? pack.filter(m => m.hp > 0).slice(0, areaMaxTargets(atkSpell.area)) : [primary];
        const totalPrevisto = alvos.reduce((s, m) => s + attachDot(m, atkSpell, ctxDot), 0);
        if (totalPrevisto > 0) pushCombat(session, { kind: 'dotcast', label: atkSpell.words, element: atkSpell.element, amount: totalPrevisto, target: primary.name });
      } else {
        hitFn = () => spellAttackDamage({ spell: atkSpell, level: session.level, magicLevel: magic, meleeSkill, weaponAtk, distanceSkill });
      }
      session.mana -= atkSpell.mana;
      startSpellCd(session, pick.id, atkSpell.cd);
      startAttackGroupCd(session);
      trainSkill(session, 'magic', atkSpell.mana, cfg);
    }

    if (hitFn) {
      const label = pick.kind === 'spell' ? pick.s.words : pick.rune.name;
      if (primary.hp > 0) {
        // Charm de dano vale pra magia/runa também (senão o mago não se beneficia).
        const sdmg = Math.max(1, Math.floor(hitFn() * elementMod(primary.defKey, element) * (1 + charmSum(session, 'damage'))));
        primary.hp -= sdmg;
        // dano da magia/runa vai NA MESMA LINHA da ação no log do cliente.
        pushCombat(session, { kind: 'spell', label, element, amount: sdmg, target: primary.name });
      }
      if (isAreaAttack(areaId) && pack.length > 1) {
        const maxTargets = areaMaxTargets(areaId);
        // Respingo de área nos OUTROS da sala (exclui o alvo principal, que já
        // levou o golpe cheio acima) — antes era pack.slice(1,...), que assumia
        // primary = pack[0]; agora que o alvo pode ser outro (ver session.targetUid)
        // filtra pelo próprio primary pra não bater duas vezes nele nem pular um.
        // FILTRA VIVOS: diferente do respingo do golpe básico, este não filtrava
        // m.hp > 0. Um DoT ou o respingo básico deste mesmo tick pode ter matado
        // alguém antes; sem o filtro, um slot de respingo era gasto num CADÁVER e
        // um monstro VIVO do fundo ficava sem levar — a magia de área rendia
        // menos justamente na sala cheia pra que ela existe.
        pack.filter(m => m !== primary && m.hp > 0).slice(0, maxTargets - 1).forEach(tgt => {
          tgt.hp -= Math.max(1, Math.floor(hitFn() * elementMod(tgt.defKey, element)));
        });
      }
    }
  }

  // Resolve TODAS as mortes deste tick (o alvo da frente e/ou os atingidos
  // pelo respingo de área) — mesmo espírito de doHuntTick no cliente.
  const primaryDied = primary.hp <= 0;
  const deaths = pack.filter(m => m.hp <= 0);
  // Remove os mortos da sala ANTES de gravar o kill. settleKill escreve no
  // Supabase (await) e PODE estourar (blip de rede); se o filtro rodasse só
  // DEPOIS do await, um settleKill que falhasse deixava o cadáver preso em
  // session.currentPack — e o próximo tick voltava a atacá-lo pra sempre:
  // Battle List vazia + log "golpe básico ao Goblin" sem monstro na tela
  // (bug reportado pelo Felipe). O corpo sai da sala mesmo se o crédito falhar.
  session.currentPack = pack.filter(m => m.hp > 0);
  for (const m of deaths) {
    try { await settleKill(session, m, cfg); }
    catch (e) { console.error('settleKill falhou (corpo já removido da sala):', session.id, m.defKey, e.message); }
  }

  // (3) contra-ataque do monstro da frente (o que sobrou, se algum) — só
  // depois de uma folga desde o spawn do pack (GRACE_MS), pra o cliente
  // sempre ter chance de mostrar o monstro na tela antes de correr QUALQUER
  // risco de dano. + cura automática — chamada SEMPRE, mesmo quando o pack
  // acabou de ser zerado neste MESMO tick (golpe do jogador matou o último
  // monstro): antes, applyRtcHealing() só rodava dentro do "else" de
  // primaryDied/pack vazio, então contra qualquer monstro fraco que morresse
  // num só golpe (comum em zona bem abaixo do nível do jogador), a cura
  // automática NUNCA tinha chance de rodar — bug reportado pelo Felipe:
  // "RTC não cura, não usa poção".
  const newPrimary = session.currentPack[0] || null;
  if (newPrimary && !primaryDied && Date.now() - (session.packSpawnedAt || 0) >= SPAWN_GRACE_MS) {
    // Contra-ataque FIEL ao Crystal Server: melee e magia disparam INDEPENDENTES no mesmo
    // tick (2s), não "um ou outro". Físico reduz por armadura + defesa de escudo
    // (Creature::blockHit); elemental (fogo/energia/...) passa direto (jogador
    // sem resistência modelada). Reusa a armadura/defesa calculada uma vez.
    const pArmor = getPlayerArmor(session);
    const pDef = getPlayerDefense(session);
    const pAbsorb = getPlayerAbsorb(session);
    // (a) melee do monstro — sempre, físico.
    // Presa de DEFESA: reduz o dano recebido daquela criatura.
    const preyDef = 1 - preyBonus(session, newPrimary.defKey, 'defense');
    const meleeDmg = Math.floor(reducePhysical(rollMonsterMelee(newPrimary), pArmor, pDef) * preyDef);
    session.hp = Math.max(0, session.hp - meleeDmg);
    let monsterDealt = meleeDmg, monsterElement = 'physical';
    // (b) magia do monstro — com chance, independente do melee. Físico reduz por
    // armadura/defesa; elemental reduz pela RESISTÊNCIA do jogador (fiel ao Crystal Server).
    if (session.hp > 0 && newPrimary.spells && newPrimary.spells.length && Math.random() < MONSTER_SPELL_CHANCE) {
      const sp = rollMonsterSpell(newPrimary);
      if (sp) {
        let sdmg = sp.damage;
        if (sp.physical) sdmg = reducePhysical(sdmg, pArmor, pDef);
        else sdmg = reduceElemental(sdmg, sp.element, pAbsorb);
        sdmg = Math.floor(sdmg * preyDef);
        session.hp = Math.max(0, session.hp - sdmg);
        monsterDealt += sdmg;
        if (sdmg > 0 && !sp.physical) monsterElement = sp.element;
      }
    }
    if (monsterDealt > 0) pushCombat(session, { kind: 'monsterhit', amount: monsterDealt, element: monsterElement, monster: newPrimary.name });
  }
  await applyRtcHealing(session, cfg);

  // Só sai sem checar morte se o alvo da frente sobreviveu (newPrimary
  // continua valendo pro bloco de morte abaixo, que usa newPrimary.name) —
  // hp só pode ter caído a 0 acima, no mesmo tick, quando havia contra-
  // ataque (newPrimary não-nulo e vivo), então esse `return` nunca pula uma
  // morte de verdade.
  if (primaryDied || !session.currentPack.length) {
    if (!session.currentPack.length) session.nextSpawnAt = Date.now() + 1500;
    await flushVitals(session);
    return;
  }

  if (session.hp <= 0) {
    // Morte de verdade: acaba a caçada aqui mesmo (fiel ao Tibia — morrer
    // encerra a luta, não continua caçando sozinho com vida cheia de graça).
    // Bênçãos AUTORITATIVAS (lidas ao vivo — podem ter sido compradas a
    // qualquer momento, ver server/src/index.js: /buy-blessing) e consumidas
    // na morte (não recuperam sozinhas — precisa comprar de novo).
    const row = await selectOne('player_stats', { user_id: session.userId, slot: session.slot });
    const blessings = row ? Math.min(MAX_BLESSINGS, Number(row.blessings) || 0) : 0;

    // Perda FIEL ao Crystal Server: incide sobre a XP TOTAL acumulada e pode
    // DE-LEVELAR (não mais só o XP do nível atual). session.xpAbs é o progresso
    // no nível corrente; a total soma os níveis anteriores da XP_TABLE.
    const level = session.level;
    const curLevelXp = session.xpAbs;
    const xpAntesDoNivel = XP_TABLE.slice(0, level - 1).reduce((a, b) => a + b, 0);
    const totalExp = xpAntesDoNivel + curLevelXp;
    const levelPercent = level < MAX_LEVEL && XP_TABLE[level - 1] ? (curLevelXp / XP_TABLE[level - 1]) * 100 : 0;
    const xpLost = Math.floor(totalExp * deathXpLossPct(level, blessings, session.promoted, levelPercent, totalExp));
    const novaTotal = Math.max(0, totalExp - xpLost);
    // recompõe nível + XP do nível a partir da total (de-levela se preciso)
    let novoNivel = 1, resto = novaTotal;
    while (novoNivel < MAX_LEVEL && resto >= XP_TABLE[novoNivel - 1]) { resto -= XP_TABLE[novoNivel - 1]; novoNivel++; }
    session.level = novoNivel;
    session.xpAbs = resto;
    session.maxHp = computeMaxHp({ vocation: session.vocation, level: novoNivel, equipment: session.equipment, relics: session.relics });
    session.maxMana = computeMaxMana({ vocation: session.vocation, level: novoNivel });

    session.hp = Math.floor(session.maxHp * reviveHpPct(blessings));
    session.mana = Math.min(session.mana, session.maxMana);
    const lastDeath = { sessionId: session.id, monster: newPrimary.name, xpLost, blessingsUsed: blessings, deleveled: novoNivel < level, at: Date.now() };
    await upsertRow('player_stats', {
      user_id: session.userId, slot: session.slot, level: novoNivel, xp: resto,
      hp: vitalInt(session.hp), mana: vitalInt(session.mana), stamina: session.stamina, blessings: 0,
      last_death: lastDeath, updated_at: new Date().toISOString(),
    }, 'user_id,slot');
    session.currentPack = [];
    // O upsert acima gravou o XP pós-penalidade como ABSOLUTO. O stopSession
    // logo abaixo dispara flushVitals, que soma session.prog.xp como DELTA — e
    // esse delta (kills desde o último flush) JÁ estava embutido no xpAbs sobre
    // o qual a penalidade foi calculada. Sem zerar aqui, o flush devolvia a XP
    // recente por cima do absoluto e ANULAVA parte da penalidade de morte
    // (morrer perto do fim de um ciclo de flush chegava a netar ganho). Zera só
    // o xp do prog; gold/kills/skills seguem flushando normal (não são gravados
    // no upsert de morte).
    if (session.prog) session.prog.xp = 0;
    // Encerra a sessão de verdade (não é só "sala vazia esperando spawn") —
    // reportado pelo Felipe: o personagem morrendo recuperava vida sozinho e
    // seguia caçando sem nada avisar. stopSession limpa os timers deste
    // processo; marcamos active:false pra o /hunt/state parar de reportar
    // hunting:true (o cliente detecta e para o loop local também).
    await updateRows('hunt_sessions', { id: session.id }, { active: false });
    stopSession(session.id);
  }
}

// --- SCHEDULER ÚNICO -----------------------------------------------------
// Antes cada caçada criava DOIS setInterval próprios (tick + flush). Com 500
// jogadores isso vira 1000 timers disputando o event loop, e o Node não os
// dispara no horário: medido, o atraso mediano de cada batida era ~180ms e o
// p99 ~350ms. Um combate cuja batida é de 2s ficava visivelmente irregular.
//
// Um scheduler só, varrendo as sessões devidas a cada 100ms, mede 14ms de
// atraso mediano e 30ms de p99 — dez vezes mais pontual, com o MESMO trabalho.
// De quebra, o custo passa a ser proporcional às sessões ATIVAS, não ao número
// de timers vivos.
const VARREDURA_MS = 100;
const FLUSH_MS = 5000;
let schedulerId = null;

function varrer() {
  const agora = Date.now();
  for (const session of live.values()) {
    if (session.stopped) continue;
    if (agora >= (session.nextTickAt || 0)) {
      // Soma a batida em vez de reagendar a partir de agora: assim um tick
      // atrasado não empurra todos os seguintes (o erro não acumula).
      session.nextTickAt = (session.nextTickAt || agora) + TICK_MS;
      // Sessão que ficou muito pra trás (processo travado, deploy) não deve
      // "recuperar" disparando várias batidas seguidas — realinha com o agora.
      if (session.nextTickAt < agora) session.nextTickAt = agora + TICK_MS;
      doTick(session);
    }
    if (agora >= (session.nextFlushAt || 0)) {
      session.nextFlushAt = agora + FLUSH_MS;
      flushVitals(session).catch(() => {});
    }
  }
  // Sem sessão viva, o scheduler se desliga — um servidor ocioso não fica
  // acordando o event loop 10x por segundo à toa.
  if (!live.size && schedulerId) { clearInterval(schedulerId); schedulerId = null; }
}

function garantirScheduler() {
  if (!schedulerId) schedulerId = setInterval(varrer, VARREDURA_MS);
}

function doTick(session) {
  if (session.busy || session.stopped) return;
  session.busy = true;
  tick(session)
    .catch(err => console.error('tick falhou', session.id, err.message))
    .finally(() => {
      session.busy = false;
      // Empurra o resultado do tick pra quem estiver ouvindo. O push é o ÚLTIMO
      // passo e está fora do caminho de decisão: se falhar, o combate já
      // aconteceu e o poll do cliente pega o estado do mesmo jeito.
      try { empurrarEstado(session); } catch {}
    });
}

// Payload do push: só o que MUDA a cada tick e é dono da sessão. Gold e XP não
// vêm por aqui de propósito — têm escritores fora da caçada (loja, mercado,
// bênçãos), e o cliente já os credita pelos killEvents. O poll lento continua
// existindo pra reconciliar esses.
function empurrarEstado(session) {
  if (session.stopped || !temOuvinte(session.userId, session.slot)) return;
  empurrar(session.userId, session.slot, {
    tipo: 'tick',
    sessionId: session.id,
    zoneId: session.zoneId,
    hp: session.hp,
    mana: session.mana,
    skills: session.skills,
    pack: (session.currentPack || []).filter(m => m.hp > 0)
      .map(m => ({ uid: m.uid, defKey: m.defKey, name: m.name, hp: Math.max(0, m.hp), maxHp: m.maxHp })),
    combatEvents: session.combatEvents || [],
    killEvents: session.killEvents || [],
    inventory: { ...(session.inv || {}) },
    questEnded: session.questEnded || null, // raid concluída: cliente encerra e volta pra zona anterior
    questReward: session.questReward || null, // item concedido (só na 1ª conclusão; null na rejogada)
  });
}

// Regeneração natural de HP/mana. Roda a CADA tick (2s), inclusive no meio da
// luta e enquanto espera o próximo grupo nascer — no Tibia a regeneração nunca
// para. Antes ela só existia com o jogo parado (um laço no cliente), então
// caçar significava zero recuperação passiva: o personagem só se curava por
// magia ou poção.
//
// Mesma taxa do modo parado (regen*3 a cada 2s = regen*90/min), pra não haver
// diferença de ritmo entre caçar e descansar. Valores inteiros de propósito:
// hp/mana são colunas INTEGER (ver vitalInt).
function regenVitals(session) {
  if (session.hp <= 0) return;                 // morto não regenera
  const voc = VOCATIONS[session.vocation];
  if (!voc) return;
  const mult = session.promoted ? PROMOTION.regenMult : 1;
  // Taxa/min do Crystal Server convertida pro tick (TICK_MS). hp/mana são
  // INTEGER no banco (ver vitalInt), então acumula a fração e só soma o inteiro
  // — senão a regen lenta (knight 10/min = 0,33/tick) truncaria pra ZERO.
  const porTick = TICK_MS / 60000;
  session.hpAcc = (session.hpAcc || 0) + (voc.hpPerMin || 0) * mult * porTick;
  session.manaAcc = (session.manaAcc || 0) + (voc.manaPerMin || 0) * mult * porTick;
  const dhp = Math.floor(session.hpAcc), dmana = Math.floor(session.manaAcc);
  if (dhp > 0) { session.hp = Math.min(session.maxHp, session.hp + dhp); session.hpAcc -= dhp; }
  if (dmana > 0) { session.mana = Math.min(session.maxMana, session.mana + dmana); session.manaAcc -= dmana; }
}

async function tick(session) {
  regenVitals(session);   // antes de qualquer saída antecipada: regenera sempre
  // zoneObj: zona resolvida passada no start (inclui as ZONAS SINTÉTICAS de
  // quest, que não estão em ZONES). Cai no catálogo pras zonas normais.
  const zone = session.zoneObj || ZONES[session.zoneId];
  if (!zone) return;
  // Quest concluída (chefe caiu): a raid tem FIM. Não repõe a sala — o chefe não
  // respawna. A sessão fica ociosa/vazia reportando questEnded no /hunt/state até
  // o cliente encerrar e voltar pra zona anterior (ver huntUseCases: reconcile).
  if (session.questEnded) { session.currentPack = []; return; }
  if (!session.currentPack || !session.currentPack.length) {
    if (Date.now() < session.nextSpawnAt) return;
    const cfg = await getGameConfig();
    // Mesma checagem de resolveTick: stopSession() pode ter marcado a sessão
    // parada enquanto este await rodava — não spawna um pack novo pra uma
    // caçada que o jogador já mandou parar.
    if (session.stopped) return;
    // Boss Rush: restringe o pool de spawn só ao boss da zona (mesma regra do
    // antigo doHuntTick do cliente, agora única fonte de verdade — ver
    // application/huntUseCases.js: setBossOnlyMode).
    let spawnZone = session.bossOnly && zone.boss ? { ...zone, monsters: [zone.boss] } : zone;
    // Quest (raid com começo/meio/fim): primeiro as ONDAS de criaturas comuns;
    // depois de abatê-las todas, o CHEFE aparece GARANTIDO (culminância). Sem
    // isto o chefe era só 1/N do pool e podia nunca spawnar (raid intravável).
    if (session.questId && QUESTS[session.questId]) {
      const commons = (QUESTS[session.questId].waves || []).flat();
      spawnZone = (session.questKills || 0) < commons.length && commons.length
        ? { ...zone, monsters: commons }
        : { ...zone, monsters: [zone.boss] };
    }
    // Boss Zone: o tier ESCALA a dificuldade do boss (HP/atk/xp/gold) pela
    // escada bossTierMultiplier — antes ficava fixo em 1 (mesmo boss em todo
    // tier). O tier vem do cliente no hunt-start (session.bossTier).
    const bossMult = session.bossOnly ? bossTierMultiplier(session.bossTier || 1) : 1;
    const spawnCfg = session.bossOnly ? null : resolveZoneSpawn(cfg, session.zoneId, zone.monsters, zone.spawn);
    let packSize = session.bossOnly ? 1 : (spawnCfg.packMin + Math.floor(Math.random() * (spawnCfg.packMax - spawnCfg.packMin + 1)));
    // Controle de DENSIDADE (ver client: setDensity) — como caçar cada zona:
    // 'solo' puxa 1 por vez (seguro/controlado), 'pack' dobra o grupo (mais
    // XP/h, mais perigo), 'normal' é o tamanho natural da zona. Não vale no Boss.
    if (!session.bossOnly) {
      if (session.density === 'solo') packSize = 1;
      else if (session.density === 'pack') packSize = Math.min(8, packSize * 2 + 1);
    }
    // uid sequencial por instância spawnada — o cliente usa isso pra saber
    // (diffando entre polls de /hunt/state) quando um monstro NOVO apareceu
    // ou quando um que já existia SUMIU (morreu), em vez de sortear/simular
    // seu próprio pack independente (ver huntUseCases.js: applyServerPack).
    session.currentPack = Array.from({ length: packSize }, () => {
      const m = spawnMonsterInstance(spawnZone, MONSTERS, session.level, bossMult, spawnCfg && spawnCfg.weights);
      m.uid = ++session.spawnSeq;
      return m;
    });
    // Marca o instante do spawn — dá uma folga (GRACE_MS, ver resolveTick)
    // antes do monstro poder contra-atacar. Sem isso, o jogador podia morrer
    // no MESMO tick em que o servidor spawna o pack, antes do cliente sequer
    // ter feito o próximo poll de /hunt/state pra desenhar o monstro na tela
    // (bug reportado: "entro na hunt e já morro sem o bicho aparecer").
    session.packSpawnedAt = Date.now();
    session.lastTickAt = Date.now();
    return;
  }
  await resolveTick(session);
}

export function startSession(session) {
  // Inventário carregado UMA vez e mantido em memória durante a caçada (ver
  // sessionQty/changeSessionInv). Começa vazio e é preenchido logo abaixo, de
  // forma assíncrona: até chegar, o RTC só deixa de usar poção/runa por alguns
  // instantes — nunca usa o que não tem, porque o cache vazio significa 0.
  session.inv = session.inv || {};
  // Absolutos carregados UMA vez: o motor passa a ser o dono deles enquanto a
  // caçada existe, e o que vai pro banco é a diferença (ver flushVitals).
  session.prog = novoProg();
  session.xpAbs = 0; session.goldAbs = 0; session.goldEarnedAbs = 0;
  session.killsAbs = 0; session.bossPointsAbs = 0; session.bossMaxTier = {};
  selectOne('player_stats', { user_id: session.userId, slot: session.slot })
    .then(row => {
      // SESSÃO ÓRFÃ: o personagem sumiu do banco enquanto esta caçada rodava.
      // Acontece num reset de contas — o processo do servidor guarda a sessão
      // em MEMÓRIA, então apagar as tabelas não a mata: ela seguia lutando com
      // os valores do personagem ANTIGO (nível, skills, equipamento).
      //
      // O sintoma que isso produziu: um sorcerer nível 1 recém-criado lançando
      // Flame Strike, que exige nível 8. A validação do servidor estava certa;
      // o `session.level` é que era do personagem que não existe mais. E como
      // não havia linha em player_stats, nada do que ele ganhava era gravado.
      //
      // Encerrar é a única saída correta: sem linha no banco não há onde
      // gravar o progresso, e continuar só produz combate fantasma.
      if (!row) {
        console.warn('sessão órfã (player_stats sumiu) — encerrando', session.id);
        session.active = false;
        return;
      }
      session.xpAbs = Number(row.xp) || 0;
      session.goldAbs = Number(row.gold) || 0;
      session.goldEarnedAbs = Number(row.total_gold_earned) || 0;
      session.killsAbs = Number(row.total_kills) || 0;
      session.bossPointsAbs = Number(row.boss_points) || 0;
      if (row.boss_max_tier && typeof row.boss_max_tier === 'object') session.bossMaxTier = row.boss_max_tier;
      if (row.level) session.level = Math.max(session.level || 1, row.level);
      // Quests já concluídas (pra não conceder o prêmio de novo numa rejogada).
      session.completedQuests = Array.isArray(row.completed_quests) ? row.completed_quests : [];
    })
    .catch(e => console.error('falha ao carregar stats da sessão', session.id, e.message))
    // Só DEPOIS de ter os absolutos o combate pode rodar. Sem esta trava, uma
    // morte que caísse antes da carga calcularia o level-up sobre XP zero — e a
    // carga chegando depois sobrescreveria o progresso dessa morte.
    .finally(() => { session.nextTickAt = Date.now(); });
  selectMany('player_inventory', { user_id: session.userId, slot: session.slot })
    .then(linhas => {
      const inv = {};
      for (const l of linhas) inv[l.item_id] = Number(l.qty);
      // Mescla em vez de substituir: entre o disparo e a resposta, um kill pode
      // ter creditado loot no cache — substituir apagaria esse crédito.
      session.inv = Object.assign(inv, session.inv);
    })
    .catch(e => console.error('falha ao carregar inventário da sessão', session.id, e.message));
  session.currentPack = [];
  session.stopped = false;
  session.spawnSeq = 0;
  session.nextSpawnAt = Date.now();
  session.spellCdUntil = {};
  session.attackGroupCdUntil = 0;
  session.potionCdUntil = 0;
  session.lastTickAt = Date.now();
  session.combatSeq = 0;      // sequência dos eventos de combate (log server-truth)
  session.combatEvents = [];  // ring buffer dos últimos eventos (ver pushCombat)
  session.killSeq = 0;        // sequência das mortes (crédito de kill server-truth)
  session.killEvents = [];    // fila das últimas mortes (ver pushKill) — cobre multi-kill de área
  session.targetUid = null;   // alvo escolhido pelo jogador (clique → /hunt/target); null = ataca a frente
  // Batida de ataque FIXA (~2s = velocidade de arma do Crystal Server), não mais escalada
  // por spd (que no Tibia é movimento, não velocidade de ataque). Ver TICK_MS.
  // Infinity até os absolutos chegarem (ver o .finally da carga acima).
  session.nextTickAt = Infinity;
  session.nextFlushAt = Date.now() + FLUSH_MS;
  live.set(session.id, session);
  porPersonagem.set(chaveSlot(session.userId, session.slot), session);
  garantirScheduler();
}

export async function stopSession(sessionId) {
  const s = live.get(sessionId);
  if (!s) return;
  // Marca ANTES de clearInterval — clearInterval só impede o PRÓXIMO tick
  // agendado; um tick já em andamento (parado num await, ex.: getGameConfig
  // ou uma leitura de inventário) continuaria até o fim e podia aplicar dano/
  // gravar vitals depois do jogador já ter mandado parar (ver checagens de
  // session.stopped em tick()/resolveTick() acima — bug reportado: "dou stop
  // hunt e continuo levando hit").
  s.stopped = true;
  // Não há mais timer próprio pra limpar: quem dispara é o scheduler único, e
  // ele pula tudo que está marcado como parado (e a sessão sai do `live`
  // logo abaixo). A marcação continua sendo o que protege um tick JÁ em
  // andamento, parado num await, de aplicar dano depois do stop.
  // AGUARDA o flush aterrissar (era fire-and-forget): numa troca rápida de zona,
  // o /hunt/start relia player_stats ANTES do flush da sessão antiga gravar, então
  // um level-up nos últimos segundos não-flushados sumia e a sessão nova recarregava
  // o nível velho, gravando-o absoluto depois = DE-LEVEL (bug de corrida). Quem
  // chama no /hunt/start agora dá await em stopSession antes de reler os stats.
  await flushVitals(s).catch(() => {});
  live.delete(sessionId);
  // Só remove do índice se ainda apontar pra ESTA sessão: uma troca rápida de
  // zona (stop + start) já pode ter registrado a nova, e apagar aqui deixaria
  // o personagem sem índice mesmo tendo caçada viva.
  if (porPersonagem.get(chaveSlot(s.userId, s.slot)) === s) porPersonagem.delete(chaveSlot(s.userId, s.slot));
}

export function getLiveSession(sessionId) {
  return live.get(sessionId);
}

// Atualiza a config do RTC (prioridade de ataque, limiares de cura) de uma
// sessão JÁ RODANDO — antes o servidor só lia `rtc` uma vez, no hunt-start
// (session.rtc = body.rtc || {}), então ajustar o RTC no meio da caçada
// (o uso mais comum: reagir a um perigo, mudar o gatilho de cura) não tinha
// NENHUM efeito até parar e começar a caçar de novo (bug reportado pelo
// Felipe: "rtc de cura nao esta funcionando"). Agora /hunt/rtc chama isto a
// cada mudança na UI enquanto G.hunting.
export function updateSessionRtc(sessionId, rtc, fightMode, density, autoSell) {
  const s = live.get(sessionId);
  if (!s) return false;
  s.rtc = rtc || {};
  // Auto-vender ao vivo: ligar/desligar (ou mudar o teto) vale já no próximo
  // drop, sem reiniciar a caçada. Só sobrescreve quando o cliente manda de fato.
  if (autoSell && typeof autoSell === 'object') {
    s.autoSell = { enabled: !!autoSell.enabled, maxValue: Math.max(0, Math.floor(Number(autoSell.maxValue) || 0)) };
  }
  // Densidade ao vivo: vale a partir do PRÓXIMO grupo que nascer (ver o cálculo
  // de packSize no spawn). Antes o cliente parava e recomeçava a caçada só pra
  // mandar a densidade nova, o que interrompia a luta em andamento — não é o
  // que se espera de um botão de preferência.
  if (density) s.density = density;
  if (fightMode) s.fightMode = fightMode; // estilo de luta ao vivo (ver combatFormulas: FIGHT_MODES)
  return true;
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
  return { ok: true, hp, mana, healedHp: hp - beforeHp, healedMana: mana - beforeMana, invItem: { id: itemId, qty: Number(invRow.qty) - 1 } };
}

// RTC (cura automática) FORA de caçada — antes o RTC só existia dentro do
// tick de combate (applyRtcHealing acima), então o jogador não tinha como se
// curar sozinho antes de entrar numa hunt: precisava clicar manualmente na
// poção pela Bag (bug reportado pelo Felipe: "nao faz sentido eu nao curar
// antes de entrar numa batalha"). Chamado pelo cliente num timer curto
// enquanto parado (ver huntUseCases.js: rtcHealInterval) — cada chamada faz
// NO MÁXIMO uma cura de spell e uma de poção (o próprio intervalo do cliente
// já funciona como o "exhaust" natural, sem precisar de estado de cooldown
// persistido aqui). `rtc` vem do cliente a cada chamada (ver /hunt/rtc) já
// que, sem sessão viva, não há onde guardar a preferência no servidor.
export async function idleRtcHealStandalone(userId, slot, rtc) {
  const stats = await selectOne('player_stats', { user_id: userId, slot });
  if (!stats) return { error: 'personagem sem stats' };
  if (stats.hp != null && Number(stats.hp) <= 0) return { ok: true, hp: stats.hp, mana: stats.mana, healedHp: 0, healedMana: 0 };

  const lastSession = await selectLatest('hunt_sessions', { user_id: userId, slot }, 'started_at');
  if (!lastSession) return { error: 'personagem sem vocação definida' };
  const vocation = lastSession.vocation;

  const eqRows = await selectMany('player_equipment', { user_id: userId, slot });
  const equipment = {};
  eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });
  const relicRows = await selectMany('player_relics', { user_id: userId, slot });
  const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));
  const maxHp = computeMaxHp({ vocation, level: stats.level, equipment, relics });
  const maxMana = computeMaxMana({ vocation, level: stats.level });

  let hp = Math.min(maxHp, stats.hp != null ? stats.hp : maxHp);
  let mana = Math.min(maxMana, stats.mana != null ? stats.mana : maxMana);
  const beforeHp = hp, beforeMana = mana;
  let usedSpell = false, usedPotionHeal = false, usedPotionMana = false;

  const r = rtc || {};
  const { spell: healSpell } = resolveHealSpell(r.healSpell, vocation, stats.level);
  const hpPct = (hp / maxHp) * 100;
  if (healSpell && hp > 0 && hpPct < (r.healSpellThreshold || 0) && mana >= healSpell.mana) {
    const skillsRow = await selectOne('player_skills', { user_id: userId, slot });
    const magicLevel = (skillsRow && skillsRow.skills && skillsRow.skills.magic && skillsRow.skills.magic.lv) || 0;
    const heal = Math.min(maxHp - hp, spellHealAmount({ spell: healSpell, level: stats.level, magicLevel }));
    hp = Math.min(maxHp, hp + heal);
    mana -= healSpell.mana;
    usedSpell = true;
  }

  if (r.healPotion && hp > 0 && ((hp / maxHp) * 100) < (r.healPotionThreshold || 0)) {
    const item = ITEMS[r.healPotion];
    if (item && canUsePotion(item, vocation, stats.level)) {
      const row = await selectOne('player_inventory', { user_id: userId, slot, item_id: r.healPotion });
      if (row && Number(row.qty) > 0) {
        hp = Math.min(maxHp, hp + potionRestore(item.heal));
        await incrementInventory(userId, slot, r.healPotion, -1);
        usedPotionHeal = true;
      }
    }
  }

  if (r.manaPotion && mana < maxMana && ((mana / maxMana) * 100) < (r.manaPotionThreshold || 0)) {
    const item = ITEMS[r.manaPotion];
    if (item && canUsePotion(item, vocation, stats.level)) {
      const row = await selectOne('player_inventory', { user_id: userId, slot, item_id: r.manaPotion });
      if (row && Number(row.qty) > 0) {
        mana = Math.min(maxMana, mana + potionRestore(item.mana));
        await incrementInventory(userId, slot, r.manaPotion, -1);
        usedPotionMana = true;
      }
    }
  }

  if (usedSpell || usedPotionHeal || usedPotionMana) {
    await updateRows('player_stats', { user_id: userId, slot }, { hp, mana });
  }
  return { ok: true, hp, mana, healedHp: hp - beforeHp, healedMana: mana - beforeMana, usedSpell, usedPotionHeal, usedPotionMana };
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

  // Serializa com o tick da caçada: doTick segura session.busy durante o tick
  // inteiro (incl. os awaits de DB). Sem isto, um uso manual de runa que caísse
  // DENTRO de um tick mexia no MESMO session.currentPack em paralelo — os dois
  // podiam matar o mesmo pack[0] e chamar settleKill nele (double gold/xp/loot),
  // ou o tick sobrescrevia a sala e perdia o kill da runa (M3). Ocupado → o
  // cliente pode tentar de novo no próximo clique.
  if (session.busy) return { error: 'ocupado, tente de novo' };
  session.busy = true;
  try {
  const temNaBag = sessionQty(session, itemId);
  if (temNaBag <= 0) return { error: 'item não pertence a esta conta/personagem' };

  if (isPotion) {
    if (!canUsePotion(item, session.vocation, session.level)) return { error: 'vocação/nível insuficiente pra esta poção' };
    const beforeHp = session.hp, beforeMana = session.mana;
    if (item.heal) session.hp = Math.min(session.maxHp, session.hp + potionRestore(item.heal));
    if (item.mana) session.mana = Math.min(session.maxMana, session.mana + potionRestore(item.mana));
    await changeSessionInv(session, itemId, -1);
    await flushVitals(session, true); // já no mutex ECON (/hunt/use-item) — não re-adquire (#R2)
    // invItem = qty AUTORITATIVA do item após o consumo, pro cliente espelhar a Bag
    // (o cliente não decrementa mais localmente — ver inventoryUseCases.js: useItem).
    return { ok: true, hp: session.hp, mana: session.mana, healedHp: session.hp - beforeHp, healedMana: session.mana - beforeMana, invItem: { id: itemId, qty: sessionQty(session, itemId) } };
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
  await changeSessionInv(session, itemId, -1);

  const deaths = pack.filter(m => m.hp <= 0);
  // Remove antes de creditar (mesma blindagem do resolveTick): um settleKill que
  // estoure não pode deixar o cadáver preso na sala.
  session.currentPack = pack.filter(m => m.hp > 0);
  for (const m of deaths) {
    try { await settleKill(session, m, cfg); }
    catch (e) { console.error('settleKill (runa) falhou (corpo já removido):', session.id, m.defKey, e.message); }
  }
  if (!session.currentPack.length) session.nextSpawnAt = Date.now() + 1500;
  await flushVitals(session, true); // já no mutex ECON (/hunt/use-item) — não re-adquire (#R2)
  return {
    ok: true, hp: session.hp, mana: session.mana,
    dmg: primaryDmg, targetName: primaryName, killed: deaths.length > 0, hitCount: targets.length,
    invItem: { id: itemId, qty: sessionQty(session, itemId) },
  };
  } finally { session.busy = false; }
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
    const newQty = await incrementInventory(userId, slot, s.itemId, count);
    if (!newQty) return { error: 'bag cheia' };
    await updateRows('player_stats', { user_id: userId, slot }, { gold: Number(stats.gold) - total });
    // devolve o item comprado pro cliente aplicar em G.inventory na hora — sem
    // isso, G.inventory só ficava correto no próximo reconcileWithServer (só
    // roda caçando), então comprar na loja fora de uma caçada mostrava a
    // quantia velha em qualquer outro painel que leia do inventário local (ex.:
    // o seletor de poção do RTC), bug reportado pelo Felipe.
    return { ok: true, gold: Number(stats.gold) - total, itemId: s.itemId, qty: newQty };
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
  // A cópia EQUIPADA nunca é vendida pela Bag: equipar NÃO tira o item de
  // player_inventory (só grava em player_equipment), então a linha do inventário
  // ainda conta a peça que está no corpo. Sem esta proteção, "Vender todos"
  // zerava o inventário e desequipava o item (bug do backlog). Vendável = posse
  // menos as cópias equipadas.
  const eqRows = await selectMany('player_equipment', { user_id: userId, slot });
  const equippedCount = eqRows.filter(r => r.item_id === itemId).length;
  const sellable = owned - equippedCount;
  if (sellable <= 0) return { error: 'item equipado — desequipe antes de vender' };
  const count = qty != null ? Math.max(1, Math.min(sellable, Math.floor(Number(qty) || 1))) : sellable;
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
