// Rubinot Idle — servidor sempre-ligado (Railway) do motor de caçada
// autoritativo. Marco 2: sessão de caça real (XP/ouro), tick independente de
// qualquer request (ver src/huntEngine.js pra limitações documentadas deste
// marco). Marco 1 era só o esqueleto (/health, /whoami).
import http from 'node:http';
import { ZONES } from '../vendor/domain/bestiary.js?v=135';
import { computeAtk, computeDef, computeSpd } from '../vendor/domain/combatFormulas.js?v=156';
import { startSession, stopSession, getLiveSession, reapStaleSessionsOnBoot } from './huntEngine.js';
import { selectOne, insertRow, updateRows } from './db.js';

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltando SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY nas env vars do serviço.');
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
      return send(res, 200, { ok: true, service: 'rubinot-idle-hunt-server', stage: 'marco-2' });
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
      if (!body.vocation || !body.level || !body.skills || !body.equipment) {
        return send(res, 400, { error: 'faltam vocation/level/skills/equipment (snapshot da sessão)' });
      }

      // Fecha qualquer sessão anterior deste slot (troca de zona = nova sessão).
      const prevRow = await selectOne('hunt_sessions', { user_id: user.id, slot, active: true });
      if (prevRow) { stopSession(prevRow.id); await updateRows('hunt_sessions', { id: prevRow.id }, { active: false }); }

      const atk = computeAtk({ vocation: body.vocation, level: body.level, skills: body.skills, equipment: body.equipment, relics: body.relics || [] });
      const def = computeDef({ skills: body.skills, equipment: body.equipment, relics: body.relics || [] });
      const spd = computeSpd({ vocation: body.vocation, equipment: body.equipment, relics: body.relics || [] });

      const inserted = await insertRow('hunt_sessions', {
        user_id: user.id, slot, zone_id: body.zoneId, boss_only: !!body.bossOnly,
        atk, def, spd, level: body.level, vocation: body.vocation,
      });

      startSession({
        id: inserted.id, userId: user.id, slot, zoneId: body.zoneId,
        atk, def, spd, level: body.level, world: body.world || 'auroria',
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
      const liveSession = activeRow ? getLiveSession(activeRow.id) : null;
      return send(res, 200, {
        ok: true,
        hunting: !!activeRow,
        zoneId: activeRow ? activeRow.zone_id : null,
        stats: stats || { gold: 0, xp: 0, level: 1, total_gold_earned: 0, total_kills: 0 },
        currentMonster: liveSession && liveSession.currentMonster ? { name: liveSession.currentMonster.name, hp: liveSession.currentMonster.hp, maxHp: liveSession.currentMonster.maxHp } : null,
        lastKill: liveSession ? liveSession.lastKill || null : null,
      });
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('erro não tratado numa requisição', err);
    send(res, 500, { error: 'erro interno' });
  }
});

reapStaleSessionsOnBoot().finally(() => {
  server.listen(PORT, () => {
    console.log(`rubinot-idle-hunt-server (marco 2) ouvindo na porta ${PORT}`);
  });
});
