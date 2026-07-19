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
import { TIBIA_SKILLS } from '../../src/domain/character.js?v=156';
import { STAMINA_MAX } from '../../src/domain/stamina.js?v=125';
import { MAX_BLESSINGS, blessingCost } from '../../src/domain/blessings.js?v=125';
import { STARTER_KITS, STARTER_SUPPLIES, ITEMS } from '../../src/domain/items.js?v=139';
import { XP_TABLE, VOCATIONS } from '../../src/domain/character.js?v=156';
import { highscoreCategory } from '../../src/domain/highscoreCategories.js?v=125';
import { dailyRewardState, rewardForStreak } from '../../src/domain/dailyReward.js?v=126';
import { isBoostActive } from '../../src/domain/shopCatalog.js?v=128';
import { startSession, stopSession, getLiveSession, reapStaleSessionsOnBoot, useItemInSession, usePotionStandalone, idleRtcHealStandalone, buyShopItemStandalone, sellItemStandalone, sellRelicStandalone, updateSessionRtc, incrementInventory } from './huntEngine.js';
import { selectOne, selectMany, selectLatest, selectManyOrdered, insertRow, updateRows, upsertRow } from './db.js';

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

async function verifySupabaseToken(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    return user && user.id ? user : null;
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
      eqRows.forEach(r => { equipment[r.eq_slot] = r.item_id; });

      const relicRows = await selectMany('player_relics', { user_id: user.id, slot });
      const relics = relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) }));

      const atk = computeAtk({ vocation: body.vocation, level, skills, equipment, relics });
      const def = computeDef({ skills, equipment, relics });
      const spd = computeSpd({ vocation: body.vocation, equipment, relics });
      const maxHp = computeMaxHp({ vocation: body.vocation, level, equipment, relics });
      const maxMana = computeMaxMana({ vocation: body.vocation, level });
      // hp/mana retomam de onde a sessão anterior deixou (ver flushVitals em
      // huntEngine.js); sem valor salvo ainda (personagem novo), começa cheio.
      const hp = stats && stats.hp != null ? Math.min(maxHp, stats.hp) : maxHp;
      const mana = stats && stats.mana != null ? Math.min(maxMana, stats.mana) : maxMana;
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
        vocation: body.vocation, level, skills, equipment, relics,
        spd, maxHp, maxMana, hp, mana, stamina, world: body.world || 'auroria',
        rtc: body.rtc || {},
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
      if (liveSession) updateSessionRtc(liveSession.id, body.rtc || {});
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

    if (url.pathname === '/hunt/state' && req.method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const slot = validSlot(Number(url.searchParams.get('slot')));
      if (slot === null) return send(res, 400, { error: 'slot inválido' });
      const activeRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      const stats = await selectOne('player_stats', { user_id: user.id, slot });
      const invRows = await selectMany('player_inventory', { user_id: user.id, slot });
      const relicRows = await selectMany('player_relics', { user_id: user.id, slot });
      const skillsRow = await selectOne('player_skills', { user_id: user.id, slot });
      const liveSession = activeRow ? getLiveSession(activeRow.id) : null;
      const inventory = {};
      invRows.forEach(r => { inventory[r.item_id] = Number(r.qty); });
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
        relics: relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) })),
        // Skills treinadas (Marco 4) — o motor de combate treina server-side
        // (huntEngine.js: trainSkill), mas nada devolvia esse progresso real pro
        // cliente: G.sk ficava travado no valor local antigo (do save), nunca
        // corrigido, mesmo o servidor já tendo uma verdade diferente (ver
        // huntUseCases.js: reconcileWithServer).
        skills: skillsRow ? skillsRow.skills : null,
        // A sala REAL de monstros (uid + defKey + name + hp/maxHp) — antes só
        // existia um `currentMonster` singular que NUNCA era populado (dead
        // code: session.currentMonster nunca era atribuído em huntEngine.js).
        // Agora o cliente renderiza a Battle List/palco/HP direto daqui (ver
        // application/huntUseCases.js: applyServerPack) em vez de rodar sua
        // PRÓPRIA simulação local com spawn/dano independentes — a causa raiz
        // do bug em que o monstro mostrado na tela não tinha nada a ver com o
        // que o servidor realmente matava e pagava.
        pack: liveSession ? liveSession.currentPack.map(m => ({ uid: m.uid, defKey: m.defKey, name: m.name, hp: Math.max(0, m.hp), maxHp: m.maxHp })) : [],
        lastKill: liveSession ? liveSession.lastKill || null : null,
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
        await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: itemId, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
      } else {
        await upsertRow('player_equipment', { user_id: user.id, slot, eq_slot: eqSlot, item_id: null, updated_at: new Date().toISOString() }, 'user_id,slot,eq_slot');
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
        await upsertRow('player_inventory', { user_id: user.id, slot, item_id: itemId, qty: 1, updated_at: new Date().toISOString() }, 'user_id,slot,item_id');
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
      return send(res, 200, {
        ok: true,
        listings: rows.map(r => ({
          id: r.id,
          sellerName: r.seller_name,
          itemId: r.item_id,
          qty: Number(r.qty),
          pricePerUnit: Number(r.price_per_unit),
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
      const inserted = await insertRow('market_listings', {
        seller_user_id: user.id, seller_slot: slot, seller_name: sellerName,
        item_id: itemId, qty, price_per_unit: price, status: 'active',
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
      await incrementInventory(user.id, slot, listing.item_id, Number(listing.qty));
      return send(res, 200, { ok: true });
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
      if (!listing || listing.status !== 'active') return send(res, 400, { error: 'anúncio não encontrado ou já encerrado' });
      if (listing.seller_user_id === user.id && listing.seller_slot === slot) return send(res, 400, { error: 'você não pode comprar do seu próprio anúncio' });
      const available = Number(listing.qty);
      if (qtyToBuy > available) return send(res, 400, { error: 'quantidade indisponível' });
      const total = Number(listing.price_per_unit) * qtyToBuy;

      const buyerWallet = await selectOne('market_wallet', { user_id: user.id, slot });
      const buyerBalance = buyerWallet ? Number(buyerWallet.balance) : 0;
      if (buyerBalance < total) return send(res, 400, { error: 'saldo insuficiente na carteira' });

      const sellerWallet = await selectOne('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot });
      const sellerBalance = (sellerWallet ? Number(sellerWallet.balance) : 0) + total;

      await upsertRow('market_wallet', { user_id: user.id, slot, balance: buyerBalance - total, updated_at: new Date().toISOString() }, 'user_id,slot');
      await upsertRow('market_wallet', { user_id: listing.seller_user_id, slot: listing.seller_slot, balance: sellerBalance, updated_at: new Date().toISOString() }, 'user_id,slot');
      await incrementInventory(user.id, slot, listing.item_id, qtyToBuy);
      const remaining = available - qtyToBuy;
      if (remaining <= 0) {
        await updateRows('market_listings', { id: listingId }, { status: 'closed', closed_at: new Date().toISOString(), qty: 0 });
      } else {
        await updateRows('market_listings', { id: listingId }, { qty: remaining });
      }
      return send(res, 200, { ok: true, itemId: listing.item_id, qty: qtyToBuy, balance: buyerBalance - total });
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

      const row = {
        user_id: user.id, slot,
        name: playerName || undefined,
        vocation: undefined, // não muda por aqui (vem do character.js já criado)
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
          skill_shielding: r.skill_shielding, bestiary_count: r.bestiary_count, updated_at: r.updated_at,
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

reapStaleSessionsOnBoot().finally(() => {
  server.listen(PORT, () => {
    console.log(`rubinot-idle-hunt-server (marco 6) ouvindo na porta ${PORT}`);
  });
});
