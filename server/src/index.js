// Rubinot Idle — servidor sempre-ligado (Railway) do motor de caçada
// autoritativo. Marco 4: equipamento e skills também autoritativos —
// hunt-start não aceita mais esses valores do cliente, lê de
// player_equipment/player_skills (ver src/huntEngine.js). Equipar um item
// vira uma ação validada (/equip) que confere posse antes de aceitar.
import http from 'node:http';
import { ZONES } from '../vendor/domain/bestiary.js?v=135';
import { computeAtk, computeDef, computeSpd } from '../vendor/domain/combatFormulas.js?v=156';
import { TIBIA_SKILLS } from '../vendor/domain/character.js?v=156';
import { startSession, stopSession, getLiveSession, reapStaleSessionsOnBoot } from './huntEngine.js';
import { selectOne, selectMany, insertRow, updateRows, upsertRow } from './db.js';

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
      return send(res, 200, { ok: true, service: 'rubinot-idle-hunt-server', stage: 'marco-4' });
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

      const inserted = await insertRow('hunt_sessions', {
        user_id: user.id, slot, zone_id: body.zoneId, boss_only: !!body.bossOnly,
        atk, def, spd, level, vocation: body.vocation,
      });

      startSession({
        id: inserted.id, userId: user.id, slot, zoneId: body.zoneId, bossOnly: !!body.bossOnly,
        atk, def, spd, level, world: body.world || 'auroria',
      });
      return send(res, 200, { ok: true, sessionId: inserted.id });
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
      const liveSession = activeRow ? getLiveSession(activeRow.id) : null;
      const inventory = {};
      invRows.forEach(r => { inventory[r.item_id] = Number(r.qty); });
      return send(res, 200, {
        ok: true,
        hunting: !!activeRow,
        zoneId: activeRow ? activeRow.zone_id : null,
        stats: stats || { gold: 0, xp: 0, level: 1, total_gold_earned: 0, total_kills: 0 },
        inventory,
        relics: relicRows.map(r => ({ id: r.id, itemId: r.item_id, rarity: r.rarity, bonusPct: Number(r.bonus_pct) })),
        currentMonster: liveSession && liveSession.currentMonster ? { name: liveSession.currentMonster.name, hp: liveSession.currentMonster.hp, maxHp: liveSession.currentMonster.maxHp } : null,
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

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('erro não tratado numa requisição', err);
    send(res, 500, { error: 'erro interno' });
  }
});

reapStaleSessionsOnBoot().finally(() => {
  server.listen(PORT, () => {
    console.log(`rubinot-idle-hunt-server (marco 4) ouvindo na porta ${PORT}`);
  });
});
