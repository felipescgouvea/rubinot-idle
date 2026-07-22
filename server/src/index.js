// Rubinot Idle — servidor sempre-ligado (Railway) do motor de caçada
// autoritativo. Marco 4: equipamento e skills também autoritativos —
// hunt-start não aceita mais esses valores do cliente, lê de
// player_equipment/player_skills (ver src/huntEngine.js). Equipar um item
// vira uma ação validada (/equip) que confere posse antes de aceitar.
// Marco 5: hunt-start também monta hp/mana/maxHp/maxMana (retomam de
// player_stats) e passa vocation/skills/equipment/relics/rtc pro motor de
// combate de verdade em huntEngine.js (magia/runa por prioridade, cura,
// contra-ataque, morte).
// Marco 6: bênçãos autoritativas (/buy-blessing, consumidas na morte com o
// valor REAL) e stamina autoritativa (regenera aqui no hunt-start pelo tempo
// real parado, cai durante a caçada em huntEngine.js).
//
// Fundação (migração "servidor é a única fonte de verdade"): Market entre
// jogadores e Highscores globais deixam de ser RPCs do Supabase chamadas
// direto pelo cliente (modelo antigo, baseado num "secret" gerado no
// navegador) e viram rotas aqui, no mesmo padrão de todo o resto deste
// arquivo. Daily Reward é o piloto de uma mecânica nova nesse modelo.
//
// PADRÃO FORMAL de toda rota nova (siga à risca ao adicionar a próxima):
//  1. `const user = await requireUser(req, res); if (!user) return;` —
//     autentica contra o GoTrue do Supabase (ver verifySupabaseToken).
//     Nenhuma rota que leia/escreva dado de personagem é pública.
//  2. Nunca aceite do cliente um valor de PROGRESSÃO (gold, level, xp,
//     skills, hp/mana, streak, saldo de carteira, etc.) — só a INTENÇÃO
//     ("quero comprar X", "quero resgatar hoje"). O servidor sempre lê o
//     valor real do Postgres antes de decidir, e escreve de volta o valor
//     que ELE calculou — nunca um número vindo do body da requisição.
//  3. Toda tabela de progresso por personagem é chaveada por
//     `(user_id, slot)` — `slot` é `ACCOUNT.activeSlot` do cliente (0 ou 1),
//     sempre validado com `validSlot()` antes de tocar no banco.
//  4. Uma rota GET idempotente (ex.: /daily-reward/state) pode recomputar e
//     aplicar um "delta pendente" antes de responder quando a mecânica
//     precisar disso (ex.: regenerar stamina pelo tempo parado, como
//     /hunt/start já faz) — mas só quando fizer sentido pro domínio; nem
//     toda leitura precisa disso (Daily Reward, por ex., não tem delta
//     pendente: o estado é sempre recomputado na hora a partir da data).
import http from 'node:http';
import { ZONES } from '../../src/domain/bestiary.js?v=147';
import { computeAtk, computeDef, computeSpd, computeMaxHp, computeMaxMana } from '../../src/domain/combatFormulas.js?v=158';
import { TIBIA_SKILLS, applySkillGain } from '../../src/domain/character.js?v=157';
import { TRAINABLE_SKILLS, TRAINING_MAX_OFFLINE_SEC, ONLINE_RATE_MULTIPLIER, TRAINING_WAND_MULT, triesForTraining } from '../../src/domain/training.js?v=127';
import { STAMINA_MAX } from '../../src/domain/stamina.js?v=125';
import { MAX_BLESSINGS, blessingCost } from '../../src/domain/blessings.js?v=125';
import { STARTER_KITS, STARTER_SUPPLIES, STARTER_AMMO_QTY, ITEMS } from '../../src/domain/items.js?v=139';
import { XP_TABLE, VOCATIONS, PROMOTION } from '../../src/domain/character.js?v=157';
import { highscoreCategory } from '../../src/domain/highscoreCategories.js?v=126';
import { IMBUEMENTS } from '../../src/domain/imbuements.js?v=125';
import { MARKET_LISTING_DAYS, MARKET_FEE_PCT, marketFee, sellerProceeds } from '../../src/domain/marketConfig.js?v=125';
import { BP_REWARDS, BP_PREMIUM_REWARDS, BP_PREMIUM_COST_RUBINI, bpTierForXp, currentBpSeason } from '../../src/domain/progression.js?v=130';

// Reseta o bp (resgates + premium) se a temporada virou desde o último — mês
// calendário (ver currentBpSeason). Preguiçoso: aplicado no próximo /bp/*.
function resetBpIfNewSeason(bp) {
  const season = currentBpSeason(new Date().toISOString().slice(0, 10));
  if (bp.season !== season) { bp.claimedFree = []; bp.claimedPremium = []; bp.premium = false; bp.season = season; }
  return bp;
}
import { dailyRewardState, rewardForStreak } from '../../src/domain/dailyReward.js?v=126';
import { isBoostActive } from '../../src/domain/shopCatalog.js?v=128';
import { SPELLS, isSpellAvailable } from '../../src/domain/spells.js?v=127';
import { spendSoul, currentSoul, maxSoul } from '../../src/domain/soul.js?v=125';
import { startSession, stopSession, getLiveSession, getLiveSessionBySlot, reapStaleSessionsOnBoot, useItemInSession, usePotionStandalone, idleRtcHealStandalone, buyShopItemStandalone, sellItemStandalone, sellRelicStandalone, updateSessionRtc, incrementInventory } from './huntEngine.js';
import { selectOne, selectMany, selectLatest, selectManyOrdered, insertRow, updateRows, upsertRow } from './db.js';
import { iniciarRealtime } from './realtime.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltando SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY nas env vars do serviço.');
}

// Default de quem ainda não tem linha em player_skills (personagem recém-
// criado) — mesmos valores-base de domain/character.js: TIBIA_SKILLS.
function defaultSkills() {
  const out = {};
  Object.entries(TIBIA_SKILLS).forEach(([id, s]) => { out[id] = { lv: s.base, tries: 0 }; });
  return out;
}

// Devolve o gold RESERVADO de uma buy offer à carteira do comprador (o poster).
// Numa buy offer, o "seller_*" da linha guarda o COMPRADOR (quem quer comprar) e
// o gold fica reservado na carteira desde o /market/list-buy. Usado ao cancelar
// ou expirar a oferta.
async function refundBuyOfferGold(listing) {
  const total = Number(listing.price_per_unit) * Number(listing.qty);
  const wallet = await selectOne('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot });
  const balance = (wallet ? Number(wallet.balance) : 0) + total;
  await upsertRow('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot, balance, updated_at: new Date().toISOString() }, 'user_id,slot');
}

// Credita o treino de dummy acumulado desde training_since em player_skills —
// AUTORITATIVO, igual a caçada credita skill (huntEngine.trainSkill). Antes o
// treino da aba Training só mexia em G.sk no cliente e o reconcile do servidor
// (G.sk = res.skills) o apagava na caçada seguinte (bug: "treino offline some").
// Online tem cap curto (o cliente credita a cada tick com a aba aberta); offline
// credita o tempo de aba fechada até TRAINING_MAX_OFFLINE_SEC. NÃO mexe em
// training_since (o endpoint decide reancorar ou limpar).
async function creditTraining(userId, slot, stats, vocation) {
  const skillId = stats.training_skill;
  if (!skillId || !TRAINABLE_SKILLS.includes(skillId) || !stats.training_since || !vocation) return { skills: null, tries: 0 };
  const mode = stats.training_mode === 'online' ? 'online' : 'offline';
  const since = new Date(stats.training_since).getTime();
  let elapsed = Math.max(0, (Date.now() - since) / 1000);
  elapsed = Math.min(elapsed, mode === 'online' ? 5 * 60 : TRAINING_MAX_OFFLINE_SEC);
  const base = mode === 'online' ? ONLINE_RATE_MULTIPLIER : 1;
  // Varinha de treino (prêmio de Arena/Battle Pass — a "exercise weapon" do
  // Tibia): enquanto a janela durar, o treino rende o dobro. Só vale a PARTE do
  // tempo coberta pela janela, senão uma varinha de 1h dobraria um treino
  // offline de 12h inteiro.
  const boostEnd = stats.training_boost_until ? new Date(stats.training_boost_until).getTime() : 0;
  const boostedSec = Math.max(0, Math.min(elapsed, (Math.min(Date.now(), boostEnd) - since) / 1000));
  const tries = triesForTraining(skillId, elapsed - boostedSec, base)
              + triesForTraining(skillId, boostedSec, base * TRAINING_WAND_MULT);
  const skillsRow = await selectOne('player_skills', { user_id: userId, slot });
  const skills = (skillsRow && skillsRow.skills) || defaultSkills();
  if (tries <= 0) return { skills, tries: 0 };
  const { sk } = applySkillGain(skills, skillId, tries, vocation);
  await upsertRow('player_skills', { user_id: userId, slot, skills: sk, updated_at: new Date().toISOString() }, 'user_id,slot');
  return { skills: sk, tries };
}

// Cache de token -> usuário. TODA rota começa validando o token, e validar é
// uma ida ao Supabase (~300ms). Com o cliente pedindo /hunt/state várias vezes
// por segundo, era ~300ms de latência somados a cada requisição só pra
// reconfirmar um token que não mudou. 60s é curto o bastante pra um token
// revogado parar de valer quase na hora, e longo o bastante pra tirar essa ida
// de praticamente todas as requisições da caçada.
const TOKEN_TTL_MS = 60000;
const tokenCache = new Map();

async function verifySupabaseToken(token) {
  if (!token) return null;
  const agora = Date.now();
  const hit = tokenCache.get(token);
  if (hit && hit.expira > agora) return hit.user;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { tokenCache.delete(token); return null; }
    const user = await res.json().catch(() => null);
    if (!user || !user.id) { tokenCache.delete(token); return null; }
    // Poda preguiçosa: sem isto o Map cresceria pra sempre num processo que
    // fica semanas de pé (cada login novo é uma chave nova).
    if (tokenCache.size > 500) {
      for (const [k, v] of tokenCache) if (v.expira <= agora) tokenCache.delete(k);
    }
    tokenCache.set(token, { user, expira: agora + TOKEN_TTL_MS });
    return user;
  } catch {
    return null;
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}

async function requireUser(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const user = await verifySupabaseToken(token);
  if (!user) { send(res, 401, { error: 'token inválido ou ausente' }); return null; }
  return user;
}

function validSlot(v) {
  return v === 0 || v === 1 ? v : null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'rubinot-idle-hunt-server', stage: 'marco-6' });
    }

    if (url.pathname === '/whoami') {
      const user = await requireUser(req, res);
      if (!user) return;
      return send(res, 200, { ok: true, userId: user.id, email: user.email });
    }

    if (url.pathname === '/hunt/start' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const zone = slot !== null && ZONES[body.zoneId];
      if (slot === null || !zone) return send(res, 400, { error: 'slot ou zoneId inválido' });
      if (!body.vocation) return send(res, 400, { error: 'falta vocation' });

      // Fecha qualquer sessão anterior deste slot (troca de zona = nova sessão).
      const prevRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      if (prevRow) { stopSession(prevRow.id); await updateRows('hunt_sessions', { id: prevRow.id }, { active: false }); }

      // Nível vem de player_stats (já autoritativo desde o Marco 2) — nunca
      // mais do cliente. Equipamento/skills vêm de player_equipment/
      // player_skills (Marco 4) — o cliente não consegue mais inflar
      // atk/def/spd inventando esses valores no snapshot.
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const level = stats ? stats.level : 1;

      const skillsRow = await selectOne('player_skills', { user_id: user.id, slot });
      const skills = skillsRow ? skillsRow.skills : defaultSkills();

      const eqRows = await selectMany('player_equipment', { user_id: user.id, slot });
      const equipment = {};
      const imbuements = {}; // eq_slot -> { id, expiresAt } (ver domain/imbuements.js)
      eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; if (r.imbuement) imbuements[r.eq_slot] = r.imbuement; });

      const relicRows = await selectMany('player_relics', { user_id: user.id, slot });
      const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));

      const atk = computeAtk({ vocation: body.vocation, level, skills, equipment, relics });
      const def = computeDef({ skills, equipment, relics });
      const spd = computeSpd({ vocation: body.vocation, equipment, relics });
      const maxHp = computeMaxHp({ vocation: body.vocation, level, equipment, relics });
      const maxMana = computeMaxMana({ vocation: body.vocation, level });
      // hp/mana retomam de onde a sessão anterior deixou (ver flushVitals em
      // huntEngine.js); sem valor salvo ainda (personagem novo), começa cheio.
      let hp = stats && stats.hp != null ? Math.min(maxHp, stats.hp) : maxHp;
      let mana = stats && stats.mana != null ? Math.min(maxMana, stats.mana) : maxMana;
      // Regeneração natural de hp/mana pelo tempo OCIOSO desde o último flush —
      // espelha o regen local do cliente enquanto parado (huntUseCases.js:
      // startRegen faz +regen*3 a cada 2s = regen*90/min sem caçar). Sem isto,
      // o cliente mostra mais mana do que player_stats tem (o regen ocioso só
      // era local) e o 1º reconcile ao dar play DERRUBA a mana pro valor velho
      // do servidor (bug: "mana caiu de 600 pra 500 sozinha ao dar play"). Mesmo
      // padrão da stamina abaixo. Cap no teto.
      if (stats && stats.updated_at) {
        const voc = VOCATIONS[body.vocation];
        const idleMin = Math.max(0, (Date.now() - new Date(stats.updated_at).getTime()) / 60000);
        const regenMult = stats.promoted ? PROMOTION.regenMult : 1; // promoção dobra o regen ocioso
        if (voc) {
          // Math.floor: idleMin é FRACIONÁRIO, então sem arredondar o hp/mana
          // viram 323.63 — e as colunas hp/mana são INTEGER. O upsert seguinte
          // devolvia 400 ("invalid input syntax for type integer") e derrubava
          // settleKill ANTES do pushKill: a criatura morria sem creditar XP,
          // gold nem loot, e sem linha no log (bug: "goblins não dão XP").
          hp = Math.floor(Math.min(maxHp, hp + (voc.hpRegen || 0) * 90 * idleMin * regenMult));
          mana = Math.floor(Math.min(maxMana, mana + (voc.manaRegen || 0) * 90 * idleMin * regenMult));
        }
      }
      // Stamina regenera (1/3 da taxa de queda) pelo tempo REAL que passou
      // desde o último flush — cobre tanto "parado no jogo" quanto "com a
      // aba fechada", igual seria descansando (não caçando) nesse intervalo.
      let stamina = stats && stats.stamina != null ? Number(stats.stamina) : STAMINA_MAX;
      if (stats && stats.updated_at) {
        const idleMinutes = Math.max(0, (Date.now() - new Date(stats.updated_at).getTime()) / 60000);
        stamina = Math.min(STAMINA_MAX, stamina + idleMinutes / 3);
      }

      // Troca de zona rápida (selectZone: stopHunt()+startHunt() de volta,
      // sem esperar o /hunt/stop responder) pode deixar VÁRIOS /hunt/start em
      // voo ao mesmo tempo pro mesmo slot — cada um vê o prevRow ainda ativo
      // e tenta fechar+inserir, e qualquer um além do primeiro esbarra na
      // constraint única (hunt_sessions_one_active_per_slot), 500 pro cliente
      // (reportado nos logs após um teste de troca rápida repetida). Retry
      // em loop — fecha de novo o que quer que esteja ativo agora e tenta de
      // novo — resolve sem precisar serializar todo o endpoint; algumas
      // tentativas cobrem até cliques bem próximos um do outro.
      let inserted;
      for (let attempt = 0; ; attempt++) {
        try {
          inserted = await insertRow('hunt_sessions', {
            user_id: user.id, slot, zone_id: body.zoneId, boss_only: !!body.bossOnly,
            atk, def, spd, level, vocation: body.vocation,
          });
          break;
        } catch (e) {
          if (!/23505/.test(e.message) || attempt >= 4) throw e;
          const raceRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
          if (raceRow) { stopSession(raceRow.id); await updateRows('hunt_sessions', { id: raceRow.id }, { active: false }); }
        }
      }

      startSession({
        id: inserted.id, userId: user.id, slot, zoneId: body.zoneId, bossOnly: !!body.bossOnly,
        bossTier: Math.max(1, Math.floor(Number(body.bossTier) || 1)), // Boss Zone: tier desafiado (escala dificuldade + prestígio)
        vocation: body.vocation, level, skills, equipment, relics, imbuements,
        spd, maxHp, maxMana, hp, mana, stamina, world: body.world || 'auroria',
        promoted: !!(stats && stats.promoted), // promoção acelera a regeneração passiva
        rtc: body.rtc || {}, fightMode: body.fightMode, // undefined = 1.0/1.0 (comportamento atual até o cliente enviar o modo)
        density: body.density, // 'solo'|'normal'|'pack' — undefined = tamanho natural
        // Presas ativas. A FORÇA do bônus não é aceita como veio: huntEngine
        // recalcula pela raridade (ver preyBonus lá) — o cliente só informa
        // qual criatura, que tipo de bônus e até quando vale.
        prey: Array.isArray(body.prey) ? body.prey : [],
      });
      return send(res, 200, { ok: true, sessionId: inserted.id });
    }

    // Atualiza a config do RTC (prioridade de ataque, gatilhos de cura) de
    // uma caçada JÁ EM ANDAMENTO — sem isso, mudar o RTC no meio da luta só
    // valia a partir do PRÓXIMO hunt-start (bug reportado: cura automática
    // por spell/poção "não funciona", pois o servidor nunca via a mudança).
    // Não faz nada de errado se não houver sessão viva (RTC só é preferência,
    // sem risco — servidor sempre valida mana/cooldown/posse na hora de usar).
    if (url.pathname === '/hunt/rtc' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      const liveSession = activeRow ? getLiveSession(activeRow.id) : null;
      if (liveSession) updateSessionRtc(liveSession.id, body.rtc || {}, body.fightMode, body.density);
      return send(res, 200, { ok: true, applied: !!liveSession });
    }

    if (url.pathname === '/hunt/stop' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      if (activeRow) { stopSession(activeRow.id); await updateRows('hunt_sessions', { id: activeRow.id }, { active: false }); }
      return send(res, 200, { ok: true });
    }

    // Alvo escolhido pelo jogador (clique na Battle List/palco) — o motor passa a
    // mirar essa criatura no golpe básico/magia enquanto ela estiver viva na sala
    // (ver huntEngine.js: resolveTick, session.targetUid). Sem estado no banco:
    // é preferência efêmera da sessão viva, some quando a caçada acaba.
    if (url.pathname === '/hunt/target' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      const live = activeRow ? getLiveSession(activeRow.id) : null;
      if (live) live.targetUid = (body.uid != null && body.uid !== '') ? String(body.uid) : null;
      return send(res, 200, { ok: true });
    }

    if (url.pathname === '/hunt/state' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const slot = validSlot(Number(url.searchParams.get('slot')));
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      // As cinco leituras são INDEPENDENTES entre si — nenhuma usa o resultado
      // da outra. Em série eram 5 idas ao Supabase somando ~1,5s, e o cliente
      // pede esta rota várias vezes por segundo: as respostas empilhavam no
      // limite de conexões do navegador e a tela ficava SEGUNDOS atrás do
      // servidor (a queixa de "jogo travado" — medido em scripts/perf-hunt.mjs).
      // Em paralelo, o custo passa a ser o da leitura mais lenta, não a soma.
      // CAÇANDO, o servidor já É o dono da verdade: inventário, relíquias,
      // skills, hp/mana e a sala vivem na memória da sessão (ver huntEngine).
      // Consultar o banco pra descobrir isso era pedir ao Supabase algo que o
      // próprio processo sabia — e esta rota é chamada ~1,7x por segundo POR
      // JOGADOR, então era ela, e não o combate, que definia o teto de escala:
      // 5 consultas x 1,7/s = 8,3 consultas por segundo por jogador.
      //
      // player_stats continua vindo do banco de propósito: gold e XP têm vários
      // escritores FORA da caçada (loja, mercado, bênçãos, recompensa diária).
      // Espelhar dinheiro em memória sem cobrir todos eles é como se perde
      // saldo de jogador — não vale o risco pelo 1 query que sobra.
      const liveSession = getLiveSessionBySlot(user.id, slot);
      const [activeRow, stats, invRows, relicRows, skillsRow] = liveSession
        ? [
            { id: liveSession.id, zone_id: liveSession.zoneId },
            await selectOne('player_stats', { user_id: user.id, slot }),
            null, null, null,   // servidos da memória logo abaixo
          ]
        : await Promise.all([
            selectOne('hunt_sessions', { user_id: user.id, slot, active: true }),
            selectOne('player_stats', { user_id: user.id, slot }),
            selectMany('player_inventory', { user_id: user.id, slot }),
            selectMany('player_relics', { user_id: user.id, slot }),
            selectOne('player_skills', { user_id: user.id, slot }),
          ]);
      const inventory = liveSession
        ? { ...(liveSession.inv || {}) }
        : (invRows || []).reduce((acc, r) => { acc[r.item_id] = Number(r.qty); return acc; }, {});
      // Quando NÃO está caçando, player_stats.hp/mana ficam CONGELADOS (o tick
      // só roda na caçada). Sem regenerar aqui, um reconcile que rode parado
      // sobrescreve o hp/mana que o cliente regenerou LOCAL pelo valor velho —
      // a mana/hp "pulam pra baixo sozinhas" no ocioso (bug pego pelo auditor de
      // browser: regen ocioso oscila). Regenera o valor DEVOLVIDO pelo tempo
      // desde updated_at, na mesma taxa do cliente (regen*90/min), cap no teto —
      // mesmo padrão do /hunt/start. Custa 2 reads a mais só nos polls ociosos
      // (na caçada, activeRow existe e o bloco é pulado).
      if (!activeRow && stats && stats.updated_at && stats.hp != null && stats.mana != null) {
        const lastSession = await selectLatest('hunt_sessions', { user_id: user.id, slot }, 'started_at');
        const vocation = lastSession && lastSession.vocation;
        const voc = vocation && VOCATIONS[vocation];
        if (voc) {
          const eqRows = await selectMany('player_equipment', { user_id: user.id, slot });
          const equipment = {}; eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });
          const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));
          const maxHp = computeMaxHp({ vocation, level: stats.level, equipment, relics });
          const maxMana = computeMaxMana({ vocation, level: stats.level });
          const idleMin = Math.max(0, (Date.now() - new Date(stats.updated_at).getTime()) / 60000);
          const regenMult = stats.promoted ? PROMOTION.regenMult : 1; // promoção dobra o regen ocioso
          // floor pelo mesmo motivo do /hunt/start: idleMin é fracionário e as
          // colunas hp/mana são INTEGER (ver comentário lá).
          stats.hp = Math.floor(Math.min(maxHp, Number(stats.hp) + (voc.hpRegen || 0) * 90 * idleMin * regenMult));
          stats.mana = Math.floor(Math.min(maxMana, Number(stats.mana) + (voc.manaRegen || 0) * 90 * idleMin * regenMult));
        }
      }
      // Com sessão VIVA, o hp/mana autoritativos são os DELA (tempo real, todo
      // tick), não os de player_stats — que só é flushado a cada 5s (ver
      // flushTimer em huntEngine.js). Sem isto, ao dar play o /hunt/state
      // devolve o hp/mana VELHO flushado (ex.: o valor de antes de descansar até
      // encher) e o cliente reconcilia pra ele: o idle mostra 135/135 mas a
      // batalha COMEÇA mostrando 41/10, corrigindo só no flush seguinte (~5s).
      // Bug de dessincronia pego pelo auditor de vitais: "os números não fazem
      // sentido ao entrar na batalha". O pack de monstros já vinha da sessão
      // viva (abaixo) — o hp/mana do jogador tinham ficado de fora.
      if (liveSession && stats) {
        stats.hp = liveSession.hp;
        stats.mana = liveSession.mana;
      }
      // Soul points: o banco guarda o valor gravado + quando; o valor de AGORA
      // é sempre recalculado pelo relógio (ver src/domain/soul.js), então quem
      // ficou com a aba fechada recupera igual a quem ficou online.
      if (stats) {
        stats.soul = currentSoul(stats.soul, stats.soul_at ? Date.parse(stats.soul_at) : Date.now(), !!stats.promoted);
        stats.soul_max = maxSoul(!!stats.promoted);
      }
      return send(res, 200, {
        ok: true,
        hunting: !!activeRow,
        // id da sessão ATIVA agora (ver huntUseCases.js: currentSessionId) —
        // permite ao cliente só aceitar um stats.last_death se ele pertencer
        // à MESMA sessão que ele acha que está rodando, nunca a uma sessão
        // antiga já substituída (troca rápida de zona podia mostrar a morte
        // da hunt ANTERIOR como se fosse da nova).
        sessionId: activeRow ? activeRow.id : null,
        zoneId: activeRow ? activeRow.zone_id : null,
        stats: stats || { gold: 0, xp: 0, level: 1, total_gold_earned: 0, total_kills: 0, hp: null, mana: null, blessings: 0, stamina: STAMINA_MAX, last_death: null },
        inventory,
        relics: liveSession ? (liveSession.relics || []) : relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) })),
        // Skills treinadas (Marco 4) — o motor de combate treina server-side
        // (huntEngine.js: trainSkill), mas nada devolvia esse progresso real pro
        // cliente: G.sk ficava travado no valor local antigo (do save), nunca
        // corrigido, mesmo o servidor já tendo uma verdade diferente (ver
        // huntUseCases.js: reconcileWithServer).
        skills: liveSession ? liveSession.skills : (skillsRow ? skillsRow.skills : null),
        // A sala REAL de monstros (uid + defKey + name + hp/maxHp) — antes só
        // existia um `currentMonster` singular que NUNCA era populado (dead
        // code: session.currentMonster nunca era atribuído em huntEngine.js).
        // Agora o cliente renderiza a Battle List/palco/HP direto daqui (ver
        // application/huntUseCases.js: applyServerPack) em vez de rodar sua
        // PRÓPRIA simulação local com spawn/dano independentes — a causa raiz
        // do bug em que o monstro mostrado na tela não tinha nada a ver com o
        // que o servidor realmente matava e pagava.
        // filter(hp>0): NUNCA manda um monstro morto como se estivesse vivo. Sem
        // isto, um GET /hunt/state que caia DENTRO da janela de `await settleKill`
        // de um tick (a rota HTTP não respeita session.busy) lê currentPack ANTES
        // do filtro de mortos rodar (huntEngine: resolveTick) e devolvia o alvo em
        // hp:0 — o cliente pintava "Goblin Leader 0/110" ainda vivo, "morto mas
        // atacando" (bug reportado pelo Felipe). O filtro real do pack acontece no
        // próprio tick logo a seguir; aqui é só não expor o estado intermediário.
        pack: liveSession ? liveSession.currentPack.filter(m => m.hp > 0).map(m => ({ uid: m.uid, defKey: m.defKey, name: m.name, hp: Math.max(0, m.hp), maxHp: m.maxHp })) : [],
        lastKill: liveSession ? liveSession.lastKill || null : null,
        combatEvents: liveSession ? (liveSession.combatEvents || []) : [], // log server-truth (dano/cura por ação, ver huntEngine: pushCombat)
        killEvents: liveSession ? (liveSession.killEvents || []) : [], // TODAS as mortes do tick (crédito server-truth — cobre multi-kill de área, ver huntEngine: pushKill)
      });
    }

    // Equipar/desequipar — ação VALIDADA: confere posse (item no
    // player_inventory com qty>0, ou relíquia própria em player_relics) antes
    // de aceitar. itemId=null desequipa (sempre permitido). Sem isso, o
    // cliente podia mandar qualquer item pro hunt-start sem realmente possuí-lo.
    if (url.pathname === '/equip' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const eqSlot = typeof body.eqSlot === 'string' ? body.eqSlot : null;
      if (slot === null || !eqSlot) return send(res, 400, { error: 'slot ou eqSlot inválido' });

      if (body.itemId != null) {
        const itemId = String(body.itemId);
        const invRow = await selectOne('player_inventory', { user_id: user.id, slot, item_id: itemId });
        const relicRow = !invRow || Number(invRow.qty) <= 0 ? await selectOne('player_relics', { user_id: user.id, slot, id: itemId }) : null;
        const owned = (invRow && Number(invRow.qty) > 0) || relicRow;
        if (!owned) return send(res, 403, { error: 'item não pertence a esta conta/personagem' });
        // imbuement: null ao trocar de item — o aprimoramento é do item que estava
        // equipado; trocar de arma perde o imbuement (evita imbuir arma barata e
        // migrar o efeito pra uma melhor).
        await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: itemId, imbuement: null, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
      } else {
        await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: null, imbuement: null, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
      }
      return send(res, 200, { ok: true });
    }

    // Kit inicial da vocação — concedido pelo SERVIDOR na criação do
    // personagem (nunca aceita o cliente declarando "já equipei X"). Antes,
    // selectVocation() só mutava G.equipment/G.inventory no cliente e nunca
    // sincronizava — hunt-start lia player_equipment vazio e computava atk/def
    // como se o personagem estivesse desarmado, mesmo o cliente mostrando o
    // kit equipado (o combate real do servidor ficava travado por baixíssimo
    // dano, embora o preview local do cliente parecesse normal). Só concede o
    // kit uma vez: se já existe QUALQUER equipamento ou item neste slot,
    // recusa — impede chamar a rota repetidamente pra farmar itens de graça.
    if (url.pathname === '/character/starter-kit' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const vocation = typeof body.vocation === 'string' ? body.vocation : null;
      if (slot === null || !vocation || !STARTER_KITS[vocation]) return send(res, 400, { error: 'slot ou vocation inválido' });

      const existingEq = await selectMany('player_equipment', { user_id: user.id, slot });
      const existingInv = await selectMany('player_inventory', { user_id: user.id, slot });
      if (existingEq.length > 0 || existingInv.length > 0) {
        return send(res, 409, { error: 'kit inicial já foi concedido pra este personagem' });
      }

      const kit = STARTER_KITS[vocation] || {};
      for (const [eqSlot, itemId] of Object.entries(kit)) {
        // munição entra como PILHA (ver STARTER_AMMO_QTY / selectVocation no
        // cliente) — 1 flecha só era o mesmo que começar "sem flecha".
        const qty = eqSlot === 'ammo' ? STARTER_AMMO_QTY : 1;
        await upsertRow('player_inventory', { user_id: user.id, slot, item_id: itemId, qty, updated_at: new Date().toISOString() }, 'user_id,slot,item_id');
        await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: itemId, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
      }
      const supplies = STARTER_SUPPLIES[vocation] || {};
      for (const [itemId, qty] of Object.entries(supplies)) {
        await upsertRow('player_inventory', { user_id: user.id, slot, item_id: itemId, qty, updated_at: new Date().toISOString() }, 'user_id,slot,item_id');
      }

      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      if (!stats) {
        await insertRow('player_stats', { user_id: user.id, slot, gold: 0, xp: 0, level: 1, total_gold_earned: 0, total_kills: 0, blessings: 0, stamina: STAMINA_MAX });
      }
      return send(res, 200, { ok: true });
    }

    // Comprar bênção — valida gold/teto no servidor (mesma regra de
    // src/application/blessingUseCases.js), nunca aceita o cliente só
    // declarando "comprei". Consumida na morte (ver huntEngine.js).
    if (url.pathname === '/buy-blessing' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const level = stats ? stats.level : 1;
      const gold = stats ? Number(stats.gold) : 0;
      const blessings = stats ? Number(stats.blessings) || 0 : 0;
      if (blessings >= MAX_BLESSINGS) return send(res, 400, { error: 'já no máximo de bênçãos' });
      const cost = blessingCost(level);
      if (gold < cost) return send(res, 400, { error: 'gold insuficiente' });
      await upsertRow('player_stats', { user_id: user.id, slot, gold: gold - cost, blessings: blessings + 1, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, gold: gold - cost, blessings: blessings + 1 });
    }

    // Conjurar (as magias que FABRICAM item: munição do paladino, runas dos
    // magos, comida do druida). Autoritativo do começo ao fim — nível,
    // vocação, mana, soul points e a Blank Rune de reagente são conferidos
    // aqui. Se o cliente pudesse declarar "conjurei", runa vira item
    // infinito e o mercado inteiro do jogo perde o sentido.
    if (url.pathname === '/conjure' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const spell = SPELLS[body.spellId];
      if (!spell || spell.type !== 'conjure') return send(res, 400, { error: 'magia de conjuração inválida' });

      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      if (!stats) return send(res, 400, { error: 'personagem sem stats' });
      // Vocação: não existe tabela de personagem no servidor — a verdade mais
      // próxima é a última caçada deste slot (mesma fonte que o highscore usa).
      // Só cai no valor informado pelo cliente se o slot nunca caçou.
      const ultimaSessao = await selectLatest('hunt_sessions', { user_id: user.id, slot }, 'started_at');
      const vocation = (ultimaSessao && ultimaSessao.vocation) || (VOCATIONS[body.vocation] ? body.vocation : null);
      if (!isSpellAvailable(body.spellId, vocation, stats.level)) {
        return send(res, 400, { error: 'vocação ou nível insuficiente pra esta magia' });
      }

      // Mana vem da sessão viva quando existe (é ela que manda durante a
      // caçada); parado, do player_stats. Sem isso, conjurar caçando gastaria
      // uma mana desatualizada e o flush seguinte devolveria o valor antigo.
      const sessaoAtiva = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      const live = sessaoAtiva ? getLiveSession(sessaoAtiva.id) : null;
      // PARADO, player_stats.mana está sempre defasado: a regeneração ociosa
      // roda no cliente e só é gravada no próximo /hunt/start ou /hunt/state.
      // Sem aplicar a mesma conta aqui, o jogador via a barra de mana cheia e
      // levava "mana insuficiente" na cara — e cada conjuração cobrava de um
      // saldo velho que o cliente logo em seguida sobrescrevia pra cima.
      // Mesma fórmula do /hunt/start (regen*90/min, dobrado se promovido).
      const vocData = VOCATIONS[vocation];
      let manaAtual;
      if (live) manaAtual = live.mana;
      else {
        const maxManaAgora = computeMaxMana({ vocation, level: stats.level });
        manaAtual = Math.min(maxManaAgora, Number(stats.mana || 0));
        if (vocData && stats.updated_at) {
          const idleMin = Math.max(0, (Date.now() - new Date(stats.updated_at).getTime()) / 60000);
          const mult = stats.promoted ? PROMOTION.regenMult : 1;
          manaAtual = Math.floor(Math.min(maxManaAgora, manaAtual + (vocData.manaRegen || 0) * 90 * idleMin * mult));
        }
      }
      if (manaAtual < spell.mana) return send(res, 400, { error: 'mana insuficiente' });

      const gasto = spendSoul(stats.soul, stats.soul_at ? Date.parse(stats.soul_at) : Date.now(), !!stats.promoted, spell.soul || 0);
      if (!gasto) return send(res, 400, { error: 'soul points insuficientes' });

      if (spell.reagent) {
        const row = await selectOne('player_inventory', { user_id: user.id, slot, item_id: spell.reagent.item });
        if (!row || Number(row.qty) < spell.reagent.count) {
          return send(res, 400, { error: `faltou ${ITEMS[spell.reagent.item].name}` });
        }
        await incrementInventory(user.id, slot, spell.reagent.item, -spell.reagent.count);
      }
      const qtd = await incrementInventory(user.id, slot, spell.conjures.item, spell.conjures.count);

      const manaNova = manaAtual - spell.mana;
      if (live) live.mana = manaNova;
      await upsertRow('player_stats', {
        user_id: user.id, slot, mana: Math.floor(manaNova),
        soul: gasto.soul, soul_at: new Date(gasto.lastAt).toISOString(),
        updated_at: new Date().toISOString(),
      }, 'user_id,slot');

      return send(res, 200, {
        ok: true, mana: Math.floor(manaNova), soul: gasto.soul, soulAt: gasto.lastAt,
        item: spell.conjures.item, count: spell.conjures.count, qty: qtd,
      });
    }

    // Promover vocação (Elite Knight / Royal Paladin / etc.) — valida nível e
    // gold no servidor (nunca aceita o cliente declarar "promovi"). Permanente,
    // dobra a regeneração ociosa (ver PROMOTION em character.js e o regen em
    // /hunt/start e /hunt/state).
    if (url.pathname === '/promote' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const level = stats ? stats.level : 1;
      const gold = stats ? Number(stats.gold) : 0;
      if (stats && stats.promoted) return send(res, 400, { error: 'já promovido' });
      if (level < PROMOTION.level) return send(res, 400, { error: `precisa do nível ${PROMOTION.level}` });
      if (gold < PROMOTION.cost) return send(res, 400, { error: 'gold insuficiente' });
      await upsertRow('player_stats', { user_id: user.id, slot, gold: gold - PROMOTION.cost, promoted: true, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, gold: gold - PROMOTION.cost, promoted: true });
    }

    // ---- Battle Pass: resgate de recompensa AUTORITATIVO ----
    // Antes o claim só fazia G.gold+=/addItem no cliente e o reconcile revertia
    // (gold/inventory são do servidor) — recompensa sumia. Agora o grant é aqui,
    // e o servidor rastreia os tiers já resgatados (bp em player_stats) pra
    // impedir resgate duplo. `xp` é reportado pelo cliente só pra checar o tier
    // alcançado (bpXp é estado do save, baixo risco — mesma confiança de hoje).
    if (url.pathname === '/bp/claim' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const tier = Math.floor(Number(body.tier));
      const kind = body.kind === 'premium' ? 'premium' : 'free';
      const rewards = kind === 'premium' ? BP_PREMIUM_REWARDS : BP_REWARDS;
      const reward = rewards.find(r => r.tier === tier);
      if (!reward) return send(res, 400, { error: 'recompensa inválida' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const bp = resetBpIfNewSeason((stats && stats.bp) || { claimedFree: [], claimedPremium: [], premium: false });
      bp.claimedFree = bp.claimedFree || []; bp.claimedPremium = bp.claimedPremium || [];
      const claimed = kind === 'premium' ? bp.claimedPremium : bp.claimedFree;
      if (claimed.includes(tier)) return send(res, 400, { error: 'já resgatado' });
      if (bpTierForXp(Math.max(0, Math.floor(Number(body.xp) || 0))) < tier) return send(res, 400, { error: 'tier não alcançado' });
      if (kind === 'premium' && !bp.premium) return send(res, 400, { error: 'precisa da trilha premium' });
      let gold = stats ? Number(stats.gold) : 0;
      let rubini = stats ? Number(stats.rubini) || 0 : 0;
      let grantedItem = null;
      if (reward.type === 'gold') gold += reward.amount;
      else if (reward.type === 'rubini') rubini += reward.amount;
      else if (reward.type === 'item') { await incrementInventory(user.id, slot, reward.itemId, 1); grantedItem = reward.itemId; }
      claimed.push(tier);
      await upsertRow('player_stats', { user_id: user.id, slot, gold, rubini, bp, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, gold, rubini, itemId: grantedItem, tier, kind });
    }

    // Comprar a trilha PREMIUM do Battle Pass (paga em Rubini Coins).
    if (url.pathname === '/bp/buy-premium' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const bp = resetBpIfNewSeason((stats && stats.bp) || { claimedFree: [], claimedPremium: [], premium: false });
      if (bp.premium) return send(res, 400, { error: 'você já tem a trilha premium' });
      const rubini = stats ? Number(stats.rubini) || 0 : 0;
      if (rubini < BP_PREMIUM_COST_RUBINI) return send(res, 400, { error: 'Rubini Coins insuficientes' });
      bp.premium = true;
      await upsertRow('player_stats', { user_id: user.id, slot, rubini: rubini - BP_PREMIUM_COST_RUBINI, bp, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, rubini: rubini - BP_PREMIUM_COST_RUBINI, premium: true });
    }

    // Aplicar um Imbuement num equipamento — valida gold + materiais no servidor
    // (nunca aceita o cliente declarar "imbui"). O efeito é resolvido no combate
    // (ver huntEngine.js) enquanto não expira. `vocation` não é usado aqui.
    if (url.pathname === '/imbue' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const def = IMBUEMENTS[body.imbuementId];
      if (!def) return send(res, 400, { error: 'imbuement inválido' });
      const eqSlot = def.slot;
      const eqRow = await selectOne('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot });
      if (!eqRow || !eqRow.item_id) return send(res, 400, { error: 'equipe uma arma primeiro' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const gold = stats ? Number(stats.gold) : 0;
      if (gold < def.cost.gold) return send(res, 400, { error: 'gold insuficiente' });
      for (const [itemId, qty] of def.cost.materials) {
        const inv = await selectOne('player_inventory', { user_id: user.id, slot, item_id: itemId });
        if (!inv || Number(inv.qty) < qty) return send(res, 400, { error: `falta material: ${itemId} x${qty}` });
      }
      await upsertRow('player_stats', { user_id: user.id, slot, gold: gold - def.cost.gold, updated_at: new Date().toISOString() }, 'user_id,slot');
      for (const [itemId, qty] of def.cost.materials) await incrementInventory(user.id, slot, itemId, -qty);
      const imbuement = { id: body.imbuementId, expiresAt: new Date(Date.now() + def.durationH * 3600 * 1000).toISOString() };
      await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: eqRow.item_id, imbuement, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      if (activeRow) { const s = getLiveSession(activeRow.id); if (s) { s.imbuements = s.imbuements || {}; s.imbuements[eqSlot] = imbuement; } }
      return send(res, 200, { ok: true, gold: gold - def.cost.gold, eqSlot, imbuement });
    }

    // ---- Treino de dummy AUTORITATIVO (aba Training) ----
    // O servidor passa a ser dono do treino (como já é da caçada): guarda
    // skill/início/modo em player_stats e credita skill real em player_skills.
    // Sem isso, o treino só existia no G.sk do cliente e era apagado pelo
    // reconcile (ver creditTraining acima). `vocation` vem do cliente (não é
    // progressão — mesma exceção de baixo risco do /hunt/start).
    if (url.pathname === '/train/start' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      if (!TRAINABLE_SKILLS.includes(body.skillId)) return send(res, 400, { error: 'skill inválida' });
      const mode = body.mode === 'online' ? 'online' : 'offline';
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      // Trocar de treino sem perder o que já acumulou: credita o anterior antes.
      let skills = null;
      if (stats && stats.training_skill) { const r = await creditTraining(user.id, slot, stats, body.vocation); skills = r.skills; }
      // Janela da varinha de treino: o cliente informa até quando o boost dele
      // vale (G.boosts.training) e o servidor guarda, pra creditar em dobro
      // mesmo o jogo estando fechado. Só aceita avançar a janela — nunca
      // encurtar uma que já estava valendo.
      const wandUntil = Number(body.trainingBoostUntil) || 0;
      const prevUntil = stats && stats.training_boost_until ? new Date(stats.training_boost_until).getTime() : 0;
      const boostUntil = Math.max(wandUntil, prevUntil);
      await upsertRow('player_stats', {
        user_id: user.id, slot,
        training_skill: body.skillId, training_since: new Date().toISOString(), training_mode: mode,
        training_boost_until: boostUntil > Date.now() ? new Date(boostUntil).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, 'user_id,slot');
      return send(res, 200, { ok: true, skills });
    }

    // Credita o acumulado e REANCORA (segue treinando) — chamado pelo tick do
    // cliente (online) e na retomada offline no boot.
    if (url.pathname === '/train/credit' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      if (!stats || !stats.training_skill) return send(res, 200, { ok: true, active: false });
      const { skills, tries } = await creditTraining(user.id, slot, stats, body.vocation);
      // Só REANCORA quando creditou de fato (>=1 try). Um tick curto de treino
      // lento (offline) credita 0 por arredondamento — reancorar aí perderia a
      // fração acumulada a cada tick e o treino nunca renderia. Sem reancorar,
      // training_since acumula até fechar 1 try.
      if (tries > 0) await upsertRow('player_stats', { user_id: user.id, slot, training_since: new Date().toISOString(), updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, active: true, skills, tries, skill: stats.training_skill, mode: stats.training_mode });
    }

    // Credita o acumulado e ENCERRA o treino (limpa o estado).
    if (url.pathname === '/train/stop' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      let skills = null, tries = 0;
      if (stats && stats.training_skill) { const r = await creditTraining(user.id, slot, stats, body.vocation); skills = r.skills; tries = r.tries; }
      await upsertRow('player_stats', { user_id: user.id, slot, training_skill: null, training_since: null, training_mode: null, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, skills, tries });
    }

    // Uso manual de item (poção/runa) clicado na Bag — ação VALIDADA: confere
    // posse/vocação/ML e aplica a MESMA matemática/kill-path do RTC
    // automático (ver huntEngine.js: useItemInSession/usePotionStandalone).
    // Sem isso o clique manual mutava hp/mana/gold/inventário só no cliente,
    // sem o servidor nunca saber (mesma categoria de bug que o tick
    // automático já tinha). Runa exige sessão viva (precisa de alvo em
    // combate); poção funciona a qualquer momento — parado ou caçando —
    // igual no Tibia real (sem isso o jogador não conseguia se curar fora
    // de uma caçada ativa, bug reportado pelo Felipe).
    if (url.pathname === '/hunt/use-item' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const itemId = typeof body.itemId === 'string' ? body.itemId : null;
      if (slot === null || !itemId) return send(res, 400, { error: 'slot ou itemId inválido' });
      const item = ITEMS[itemId];
      if (!item) return send(res, 400, { error: 'item inválido' });
      const isRune = item.type === 'rune' && item.dmg;

      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      const liveSession = activeRow ? getLiveSession(activeRow.id) : null;
      if (isRune) {
        if (!liveSession) return send(res, 400, { error: 'sem caçada ativa' });
        const result = await useItemInSession(liveSession, itemId);
        if (result.error) return send(res, 400, { error: result.error });
        return send(res, 200, result);
      }
      // Poção: se há sessão viva, ela é a fonte de verdade do hp/mana desse
      // instante; senão lê/escreve direto em player_stats.
      const result = liveSession
        ? await useItemInSession(liveSession, itemId)
        : await usePotionStandalone(user.id, slot, itemId);
      if (result.error) return send(res, 400, { error: result.error });
      return send(res, 200, result);
    }

    // RTC parado (fora de caçada) — cura automática por spell/poção igual ao
    // RTC de dentro do combate, mas rodando enquanto o personagem não está
    // caçando (ver huntEngine.js: idleRtcHealStandalone). Chamado pelo
    // cliente num timer curto (ver huntUseCases.js: rtcHealInterval) — sem
    // sessão viva o servidor não tem onde guardar a config do RTC, então o
    // cliente manda ela em toda chamada (mesmo padrão de /hunt/start).
    if (url.pathname === '/hunt/idle-heal' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      if (activeRow && getLiveSession(activeRow.id)) return send(res, 400, { error: 'caçada ativa — o RTC de combate já cuida disso' });
      const result = await idleRtcHealStandalone(user.id, slot, body.rtc || {});
      if (result.error) return send(res, 400, { error: result.error });
      return send(res, 200, result);
    }

    // Comprar na loja / vender item / vender relíquia — mesma categoria de
    // bug que /hunt/use-item já corrigiu: antes G.gold/G.inventory/G.relics
    // só mutavam no cliente, e o próximo reconcileWithServer() (a cada tick
    // de combate) sobrescrevia com o valor real do banco, revertendo a
    // compra/venda em silêncio (achado na varredura de QA). Preço/posse
    // sempre conferidos aqui, nunca aceitos do cliente.
    if (url.pathname === '/shop/buy' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const shopItemId = typeof body.shopItemId === 'string' ? body.shopItemId : null;
      if (slot === null || !shopItemId) return send(res, 400, { error: 'slot ou shopItemId inválido' });
      const result = await buyShopItemStandalone(user.id, slot, shopItemId, body.qty);
      if (result.error) return send(res, 400, { error: result.error });
      return send(res, 200, result);
    }

    if (url.pathname === '/inventory/sell' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const itemId = typeof body.itemId === 'string' ? body.itemId : null;
      if (slot === null || !itemId) return send(res, 400, { error: 'slot ou itemId inválido' });
      const result = await sellItemStandalone(user.id, slot, itemId, body.qty);
      if (result.error) return send(res, 400, { error: result.error });
      return send(res, 200, result);
    }

    if (url.pathname === '/inventory/sell-relic' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const relicId = typeof body.relicId === 'string' ? body.relicId : null;
      if (slot === null || !relicId) return send(res, 400, { error: 'slot ou relicId inválido' });
      const result = await sellRelicStandalone(user.id, slot, relicId);
      if (result.error) return send(res, 400, { error: result.error });
      return send(res, 200, result);
    }

    // ---- Market entre jogadores ----
    // Carteira (market_wallet) é SEPARADA do gold do personagem (player_stats)
    // de propósito — depositar "trava" o gold pra uso no Market, igual ao
    // modelo antigo (secret) já fazia; só muda quem guarda a fronteira.
    if (url.pathname === '/market/wallet' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const slot = validSlot(Number(url.searchParams.get('slot')));
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const wallet = await selectOne('market_wallet', { user_id: user.id, slot });
      return send(res, 200, { ok: true, balance: wallet ? Number(wallet.balance) : 0 });
    }

    if (url.pathname === '/market/deposit' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const amount = Math.floor(Number(body.amount));
      if (slot === null || !amount || amount <= 0) return send(res, 400, { error: 'slot ou amount inválido' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const gold = stats ? Number(stats.gold) : 0;
      if (gold < amount) return send(res, 400, { error: 'gold insuficiente' });
      const wallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const balance = (wallet ? Number(wallet.balance) : 0) + amount;
      await upsertRow('player_stats', { user_id: user.id, slot, gold: gold - amount, updated_at: new Date().toISOString() }, 'user_id,slot');
      await upsertRow('market_wallet', { user_id: user.id, slot, balance, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, gold: gold - amount, balance });
    }

    if (url.pathname === '/market/withdraw' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const amount = Math.floor(Number(body.amount));
      if (slot === null || !amount || amount <= 0) return send(res, 400, { error: 'slot ou amount inválido' });
      const wallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const balance = wallet ? Number(wallet.balance) : 0;
      if (balance < amount) return send(res, 400, { error: 'saldo insuficiente na carteira' });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const gold = (stats ? Number(stats.gold) : 0) + amount;
      await upsertRow('market_wallet', { user_id: user.id, slot, balance: balance - amount, updated_at: new Date().toISOString() }, 'user_id,slot');
      await upsertRow('player_stats', { user_id: user.id, slot, gold, updated_at: new Date().toISOString() }, 'user_id,slot');
      return send(res, 200, { ok: true, gold, balance: balance - amount });
    }

    if (url.pathname === '/market/listings' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const slot = validSlot(Number(url.searchParams.get('slot')));
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const rows = await selectManyOrdered('market_listings', { status: 'active' }, { order: 'created_at.desc', limit: 100 });
      // Expiração preguiçosa: fecha as ofertas vencidas e DEVOLVE o item ao
      // vendedor (o item ficava em escrow desde o /list). Fiel ao Tibia, onde
      // ofertas de mercado expiram após alguns dias.
      const now = Date.now();
      const active = [];
      for (const r of rows) {
        if (r.expires_at && new Date(r.expires_at).getTime() < now) {
          await updateRows('market_listings', { id: r.id }, { status: 'expired', closed_at: new Date().toISOString() });
          // sell: devolve o item ao vendedor; buy: devolve o gold reservado à
          // carteira do comprador (escrow diferente por tipo de oferta).
          if (r.kind === 'buy') await refundBuyOfferGold(r);
          else await incrementInventory(r.seller_user_id, r.seller_slot, r.item_id, Number(r.qty));
        } else active.push(r);
      }
      return send(res, 200, {
        ok: true,
        feePct: MARKET_FEE_PCT,
        listings: active.map(r => ({
          id: r.id,
          kind: r.kind || 'sell',
          sellerName: r.seller_name,
          itemId: r.item_id,
          qty: Number(r.qty),
          pricePerUnit: Number(r.price_per_unit),
          expiresAt: r.expires_at,
          mine: r.seller_user_id === user.id && r.seller_slot === slot,
        })),
      });
    }

    if (url.pathname === '/market/list' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const itemId = typeof body.itemId === 'string' ? body.itemId : null;
      const qty = Math.floor(Number(body.qty));
      const price = Math.floor(Number(body.price));
      if (slot === null || !itemId || !ITEMS[itemId] || !qty || qty <= 0 || !price || price <= 0) {
        return send(res, 400, { error: 'parâmetros inválidos' });
      }
      const invRow = await selectOne('player_inventory', { user_id: user.id, slot, item_id: itemId });
      const owned = invRow ? Number(invRow.qty) : 0;
      if (owned < qty) return send(res, 400, { error: 'você não tem essa quantidade do item' });
      await incrementInventory(user.id, slot, itemId, -qty);
      const sellerName = String(body.sellerName || '').slice(0, 20) || 'Jogador';
      const expiresAt = new Date(Date.now() + MARKET_LISTING_DAYS * 86400 * 1000).toISOString();
      const inserted = await insertRow('market_listings', {
        seller_user_id: user.id, seller_slot: slot, seller_name: sellerName,
        item_id: itemId, qty, price_per_unit: price, status: 'active', expires_at: expiresAt,
      });
      return send(res, 200, { ok: true, listingId: inserted.id });
    }

    if (url.pathname === '/market/cancel' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const listingId = typeof body.listingId === 'string' ? body.listingId : null;
      if (slot === null || !listingId) return send(res, 400, { error: 'slot ou listingId inválido' });
      const listing = await selectOne('market_listings', { id: listingId });
      if (!listing || listing.status !== 'active') return send(res, 400, { error: 'anúncio não encontrado ou já encerrado' });
      if (listing.seller_user_id !== user.id || listing.seller_slot !== slot) return send(res, 403, { error: 'este anúncio não é seu' });
      await updateRows('market_listings', { id: listingId }, { status: 'closed', closed_at: new Date().toISOString() });
      // sell: devolve o item; buy: devolve o gold reservado.
      if (listing.kind === 'buy') await refundBuyOfferGold(listing);
      else await incrementInventory(user.id, slot, listing.item_id, Number(listing.qty));
      return send(res, 200, { ok: true });
    }

    // Postar uma BUY OFFER (ordem de compra): reserva o gold da carteira agora e
    // qualquer vendedor pode preencher (ver /market/fill). O "seller_*" da linha
    // guarda o COMPRADOR (poster). Fiel ao Tibia, onde o Market tem ordens de
    // compra e de venda.
    if (url.pathname === '/market/list-buy' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const itemId = typeof body.itemId === 'string' ? body.itemId : null;
      const qty = Math.floor(Number(body.qty));
      const price = Math.floor(Number(body.price));
      if (slot === null || !itemId || !ITEMS[itemId] || !qty || qty <= 0 || !price || price <= 0) {
        return send(res, 400, { error: 'parâmetros inválidos' });
      }
      const total = price * qty;
      const wallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const balance = wallet ? Number(wallet.balance) : 0;
      if (balance < total) return send(res, 400, { error: 'saldo insuficiente na carteira pra reservar a compra' });
      await upsertRow('market_wallet', { user_id: user.id, slot, balance: balance - total, updated_at: new Date().toISOString() }, 'user_id,slot');
      const buyerName = String(body.sellerName || '').slice(0, 20) || 'Jogador';
      const expiresAt = new Date(Date.now() + MARKET_LISTING_DAYS * 86400 * 1000).toISOString();
      const inserted = await insertRow('market_listings', {
        seller_user_id: user.id, seller_slot: slot, seller_name: buyerName, kind: 'buy',
        item_id: itemId, qty, price_per_unit: price, status: 'active', expires_at: expiresAt,
      });
      return send(res, 200, { ok: true, listingId: inserted.id, balance: balance - total });
    }

    // Preencher uma BUY OFFER: um VENDEDOR entrega o item e recebe o gold (menos
    // a taxa) que já estava reservado. O comprador (poster) recebe o item.
    if (url.pathname === '/market/fill' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const listingId = typeof body.listingId === 'string' ? body.listingId : null;
      const qtyToFill = Math.floor(Number(body.qty));
      if (slot === null || !listingId || !qtyToFill || qtyToFill <= 0) return send(res, 400, { error: 'parâmetros inválidos' });
      const listing = await selectOne('market_listings', { id: listingId });
      if (!listing || listing.status !== 'active' || listing.kind !== 'buy') return send(res, 400, { error: 'ordem de compra não encontrada' });
      if (listing.seller_user_id === user.id && listing.seller_slot === slot) return send(res, 400, { error: 'você não pode preencher sua própria ordem' });
      const available = Number(listing.qty);
      if (qtyToFill > available) return send(res, 400, { error: 'quantidade indisponível' });
      const invRow = await selectOne('player_inventory', { user_id: user.id, slot, item_id: listing.item_id });
      if (!invRow || Number(invRow.qty) < qtyToFill) return send(res, 400, { error: 'você não tem esse item pra vender' });
      const total = Number(listing.price_per_unit) * qtyToFill;
      const proceeds = sellerProceeds(total);
      // vendedor: -item, +gold (menos taxa); comprador (poster): +item. O gold já
      // saiu da carteira do comprador no /market/list-buy (reserva).
      await incrementInventory(user.id, slot, listing.item_id, -qtyToFill);
      await incrementInventory(listing.seller_user_id, listing.seller_slot, listing.item_id, qtyToFill);
      const sellerWallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const sellerBalance = (sellerWallet ? Number(sellerWallet.balance) : 0) + proceeds;
      await upsertRow('market_wallet', { user_id: user.id, slot, balance: sellerBalance, updated_at: new Date().toISOString() }, 'user_id,slot');
      await insertRow('market_transactions', { item_id: listing.item_id, price_per_unit: Number(listing.price_per_unit), qty: qtyToFill });
      const remaining = available - qtyToFill;
      if (remaining <= 0) await updateRows('market_listings', { id: listingId }, { status: 'closed', closed_at: new Date().toISOString(), qty: 0 });
      else await updateRows('market_listings', { id: listingId }, { qty: remaining });
      return send(res, 200, { ok: true, itemId: listing.item_id, qty: qtyToFill, balance: sellerBalance, fee: marketFee(total) });
    }

    if (url.pathname === '/market/buy' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      const listingId = typeof body.listingId === 'string' ? body.listingId : null;
      const qtyToBuy = Math.floor(Number(body.qty));
      if (slot === null || !listingId || !qtyToBuy || qtyToBuy <= 0) return send(res, 400, { error: 'parâmetros inválidos' });
      const listing = await selectOne('market_listings', { id: listingId });
      if (!listing || listing.status !== 'active' || listing.kind === 'buy') return send(res, 400, { error: 'anúncio não encontrado ou já encerrado' });
      if (listing.seller_user_id === user.id && listing.seller_slot === slot) return send(res, 400, { error: 'você não pode comprar do seu próprio anúncio' });
      const available = Number(listing.qty);
      if (qtyToBuy > available) return send(res, 400, { error: 'quantidade indisponível' });
      const total = Number(listing.price_per_unit) * qtyToBuy;

      const buyerWallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const buyerBalance = buyerWallet ? Number(buyerWallet.balance) : 0;
      if (buyerBalance < total) return send(res, 400, { error: 'saldo insuficiente na carteira' });

      // Taxa da casa: o vendedor recebe o total MENOS a taxa (sink de gold,
      // segura a inflação — fiel ao mercado do Tibia). O comprador paga o total.
      const proceeds = sellerProceeds(total);
      const sellerWallet = await selectOne('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot });
      const sellerBalance = (sellerWallet ? Number(sellerWallet.balance) : 0) + proceeds;

      await upsertRow('market_wallet', { user_id: user.id, slot, balance: buyerBalance - total, updated_at: new Date().toISOString() }, 'user_id,slot');
      await upsertRow('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot, balance: sellerBalance, updated_at: new Date().toISOString() }, 'user_id,slot');
      await incrementInventory(user.id, slot, listing.item_id, qtyToBuy);
      // Histórico de preço (market_transactions) — alimenta o /market/stats.
      await insertRow('market_transactions', { item_id: listing.item_id, price_per_unit: Number(listing.price_per_unit), qty: qtyToBuy });
      const remaining = available - qtyToBuy;
      if (remaining <= 0) {
        await updateRows('market_listings', { id: listingId }, { status: 'closed', closed_at: new Date().toISOString(), qty: 0 });
      } else {
        await updateRows('market_listings', { id: listingId }, { qty: remaining });
      }
      return send(res, 200, { ok: true, itemId: listing.item_id, qty: qtyToBuy, balance: buyerBalance - total, fee: marketFee(total) });
    }

    // Estatística de preço de um item (últimas vendas reais) — alimenta a
    // decisão de preço no anúncio, como a aba de estatísticas do Market do Tibia.
    if (url.pathname === '/market/stats' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const itemId = url.searchParams.get('itemId');
      if (!itemId || !ITEMS[itemId]) return send(res, 400, { error: 'itemId inválido' });
      const rows = await selectManyOrdered('market_transactions', { item_id: itemId }, { order: 'sold_at.desc', limit: 50 });
      if (!rows.length) return send(res, 200, { ok: true, itemId, count: 0 });
      const prices = rows.map(r => Number(r.price_per_unit));
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return send(res, 200, { ok: true, itemId, count: prices.length, last: prices[0], avg, min: Math.min(...prices), max: Math.max(...prices) });
    }

    // ---- Highscores globais ----
    if (url.pathname === '/highscores/submit' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      let playerName = typeof body.playerName === 'string' ? body.playerName.trim() : null;
      if (playerName != null && (playerName.length < 3 || playerName.length > 20)) {
        return send(res, 400, { error: 'nome precisa ter entre 3 e 20 caracteres' });
      }

      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const skillsRow = await selectOne('player_skills', { user_id: user.id, slot });
      const level = stats ? stats.level : 1;
      const xpNow = stats ? Number(stats.xp) : 0;
      const totalXp = xpNow + XP_TABLE.slice(0, level - 1).reduce((a, b) => a + b, 0);
      const sk = (skillsRow && skillsRow.skills) || {};

      // Vocação do ranking: vinha fixa em `undefined` com a justificativa de que
      // "já é gravada em outro lugar" — mas nada nunca gravava, e a coluna ficava
      // NULL para TODO mundo (a auditoria pegou o ranking inteiro mostrando
      // "null" na coluna Vocação). player_stats não guarda vocação; quem guarda
      // é hunt_sessions. Usa a da última sessão e, se o jogador ainda não caçou,
      // aceita a informada pelo cliente — validada contra a lista real.
      const ultimaSessao = await selectLatest('hunt_sessions', { user_id: user.id, slot }, 'started_at');
      const vocacaoInformada = VOCATIONS[body.vocation] ? body.vocation : undefined;
      const vocacao = (ultimaSessao && ultimaSessao.vocation) || vocacaoInformada;

      const row = {
        user_id: user.id, slot,
        name: playerName || undefined,
        vocation: vocacao,
        level, xp: totalXp, total_kills: stats ? Number(stats.total_kills) : 0,
        // TODO: migrar arena/tasks/bestiário pro servidor quando essas
        // mecânicas virarem autoritativas — hoje ainda são calculadas e
        // reportadas pelo cliente, não é uma regressão desta fase.
        arena_points: Math.floor(Number(body.arenaPoints)) || 0,
        tasks_done: Math.floor(Number(body.tasksDone)) || 0,
        world: typeof body.world === 'string' ? body.world : undefined,
        bestiary_count: Math.floor(Number(body.bestiaryCount)) || 0,
        skill_magic: (sk.magic && sk.magic.lv) || 0,
        skill_fist: (sk.fist && sk.fist.lv) || 10,
        skill_club: (sk.club && sk.club.lv) || 10,
        skill_sword: (sk.sword && sk.sword.lv) || 10,
        skill_axe: (sk.axe && sk.axe.lv) || 10,
        skill_distance: (sk.distance && sk.distance.lv) || 10,
        skill_shielding: (sk.shielding && sk.shielding.lv) || 10,
        // Ranking de Boss Zone: soma dos tiers máximos derrotados em cada zona
        // (server-autoritativo, ver settleKill em huntEngine.js: boss_max_tier).
        // Um número só, "quão longe empurrou os bosses no total".
        boss_tier: stats && stats.boss_max_tier && typeof stats.boss_max_tier === 'object'
          ? Object.values(stats.boss_max_tier).reduce((a, b) => a + (Number(b) || 0), 0) : 0,
        updated_at: new Date().toISOString(),
      };
      Object.keys(row).forEach(k => { if (row[k] === undefined) delete row[k]; });

      try {
        await upsertRow('rubinot_idle_scores', row, 'user_id,slot');
      } catch (e) {
        if (/23505/.test(e.message) || /"name"/.test(e.message)) {
          // 200 (não 409) de propósito: nome duplicado é um resultado esperado,
          // não um erro de protocolo — evita o "POST 409 (Conflict)" vermelho
          // no console do jogador. O cliente detecta ok:false + 'em uso' e
          // mostra a notificação (ver application/highscoresUseCases.js).
          return send(res, 200, { ok: false, error: 'nome já em uso' });
        }
        throw e;
      }
      return send(res, 200, { ok: true });
    }

    if (url.pathname === '/highscores' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const categoryKey = url.searchParams.get('category') || 'level';
      const { column } = highscoreCategory(categoryKey);
      const order = column === 'xp' ? 'xp.desc' : `${column}.desc,xp.desc`;
      const rows = await selectManyOrdered('rubinot_idle_scores', {}, { order, limit: 50 });
      return send(res, 200, {
        ok: true,
        rows: rows.map(r => ({
          name: r.name, vocation: r.vocation, level: r.level, xp: r.xp,
          total_kills: r.total_kills, arena_points: r.arena_points, tasks_done: r.tasks_done,
          world: r.world, skill_magic: r.skill_magic, skill_fist: r.skill_fist, skill_club: r.skill_club,
          skill_sword: r.skill_sword, skill_axe: r.skill_axe, skill_distance: r.skill_distance,
          skill_shielding: r.skill_shielding, bestiary_count: r.bestiary_count, boss_tier: r.boss_tier, updated_at: r.updated_at,
        })),
      });
    }

    // ---- Daily Reward (piloto da nova arquitetura) ----
    if (url.pathname === '/daily-reward/state' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const slot = validSlot(Number(url.searchParams.get('slot')));
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const row = await selectOne('player_daily_reward', { user_id: user.id, slot });
      const state = dailyRewardState(row ? row.last_claim_date : null, row ? row.streak : 0, todayStr());
      return send(res, 200, { ok: true, canClaim: state.canClaim, streak: state.streak });
    }

    if (url.pathname === '/daily-reward/claim' && req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const slot = validSlot(body.slot);
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const row = await selectOne('player_daily_reward', { user_id: user.id, slot });
      const state = dailyRewardState(row ? row.last_claim_date : null, row ? row.streak : 0, todayStr());
      if (!state.canClaim) return send(res, 400, { error: 'já resgatado hoje' });
      const reward = rewardForStreak(state.streak);

      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const gold0 = stats ? Number(stats.gold) : 0;
      const rubini0 = stats ? Number(stats.rubini) || 0 : 0;
      const boosts0 = (stats && stats.boosts) || {};
      let gold = gold0, rubini = rubini0, hp = stats ? stats.hp : null, mana = stats ? stats.mana : null, boosts = boosts0;

      if (reward.type === 'gold') {
        gold = gold0 + reward.amount;
        await upsertRow('player_stats', { user_id: user.id, slot, gold, updated_at: new Date().toISOString() }, 'user_id,slot');
      } else if (reward.type === 'rubini') {
        rubini = rubini0 + reward.amount;
        await upsertRow('player_stats', { user_id: user.id, slot, rubini, updated_at: new Date().toISOString() }, 'user_id,slot');
      } else if (reward.type === 'refill') {
        const level = stats ? stats.level : 1;
        const eqRows = await selectMany('player_equipment', { user_id: user.id, slot });
        const equipment = {};
        eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });
        const relicRows = await selectMany('player_relics', { user_id: user.id, slot });
        const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));
        const lastSession = await selectLatest('hunt_sessions', { user_id: user.id, slot }, 'started_at');
        const vocation = (lastSession && lastSession.vocation) || Object.keys(VOCATIONS)[0];
        const maxHp = computeMaxHp({ vocation, level, equipment, relics });
        const maxMana = computeMaxMana({ vocation, level });
        hp = maxHp; mana = maxMana;
        await upsertRow('player_stats', { user_id: user.id, slot, hp, mana, updated_at: new Date().toISOString() }, 'user_id,slot');
      } else if (reward.type === 'boost') {
        const base = isBoostActive(boosts0, reward.boost, Date.now()) ? boosts0[reward.boost] : Date.now();
        boosts = { ...boosts0, [reward.boost]: base + reward.minutes * 60000 };
        await upsertRow('player_stats', { user_id: user.id, slot, boosts, updated_at: new Date().toISOString() }, 'user_id,slot');
      }

      await upsertRow('player_daily_reward', {
        user_id: user.id, slot, last_claim_date: todayStr(), streak: state.streak, updated_at: new Date().toISOString(),
      }, 'user_id,slot');

      return send(res, 200, { ok: true, reward, gold, rubini, hp, mana, boosts });
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('erro não tratado numa requisição', err);
    send(res, 500, { error: 'erro interno' });
  }
});

// Canal de tempo real no MESMO servidor HTTP (o Railway expõe uma porta só).
// Reaproveita verifySupabaseToken, então o handshake do socket passa pelo mesmo
// cache de token de 60s das rotas REST.
iniciarRealtime(server, verifySupabaseToken);

reapStaleSessionsOnBoot().finally(() => {
  server.listen(PORT, () => {
    console.log(`rubinot-idle-hunt-server (marco 6 + tempo real) ouvindo na porta ${PORT}`);
  });
});
