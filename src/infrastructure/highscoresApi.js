// Chamadas de rede do ranking global. Sem estado, sem regra de negócio (o
// throttle de "1x por minuto" e a decisão de quando reenviar vivem em
// application/highscoresUseCases.js).

import { rpcRequest, selectRequest } from './supabaseClient.js?v=126';
import { highscoreCategory } from '../domain/highscoreCategories.js?v=125';

const SCORE_COLUMNS = 'name,vocation,level,xp,total_kills,arena_points,tasks_done,world,skill_magic,skill_fist,skill_club,skill_sword,skill_axe,skill_distance,skill_shielding,bestiary_count,updated_at';

export async function submitScoreRequest(payload) {
  try {
    await rpcRequest('rubinot_idle_submit', payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// `categoryKey` decide a coluna de ordenação (ver domain/highscoreCategories.js)
// — mesma tabela/colunas selecionadas pra todas, só o ORDER BY muda. xp.desc
// como desempate sempre (mesmo critério de antes pra 'level').
export function fetchHighscoresRequest(categoryKey = 'level') {
  const { column } = highscoreCategory(categoryKey);
  const order = column === 'xp' ? 'xp.desc' : `${column}.desc,xp.desc`;
  return selectRequest(`rubinot_idle_scores?select=${SCORE_COLUMNS}&order=${order}&limit=50`);
}

export async function fetchArenaOpponentRequest(level, excludeName) {
  const lo = Math.max(1, level - 15), hi = level + 15;
  const rows = await selectRequest(
    `rubinot_idle_scores?select=name,vocation,level,arena_points&level=gte.${lo}&level=lte.${hi}&name=neq.${encodeURIComponent(excludeName || '~')}&limit=20`
  );
  if (!rows || !rows.length) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}
