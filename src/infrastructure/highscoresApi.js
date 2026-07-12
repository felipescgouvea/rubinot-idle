// Chamadas de rede do ranking global. Sem estado, sem regra de negócio (o
// throttle de "1x por minuto" e a decisão de quando reenviar vivem em
// application/highscoresUseCases.js).

import { rpcRequest, selectRequest } from './supabaseClient.js?v=70';

export async function submitScoreRequest(payload) {
  try {
    await rpcRequest('rubinot_idle_submit', payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

export function fetchHighscoresRequest() {
  return selectRequest(
    'rubinot_idle_scores?select=name,vocation,level,xp,total_kills,arena_points,tasks_done,world,updated_at&order=level.desc,xp.desc&limit=50'
  );
}

export async function fetchArenaOpponentRequest(level, excludeName) {
  const lo = Math.max(1, level - 15), hi = level + 15;
  const rows = await selectRequest(
    `rubinot_idle_scores?select=name,vocation,level,arena_points&level=gte.${lo}&level=lte.${hi}&name=neq.${encodeURIComponent(excludeName || '~')}&limit=20`
  );
  if (!rows || !rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}
