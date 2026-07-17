// Config privilegiada do jogo (public.game_config) — mesma tabela que o
// Painel Admin grava via a Edge Function admin-config-set (ver
// supabase/functions/admin-config-set). O servidor de caçada lê direto do
// Postgres (service role), sempre fresca (nunca hardcoded aqui) — assim
// mudar uma taxa no painel também vale pro cálculo autoritativo, sem redeploy.
import { sanitizeAdminConfig, DEFAULT_ADMIN_CONFIG } from '../../src/domain/adminConfig.js?v=128';
import { selectOne } from './db.js';

let cache = sanitizeAdminConfig(DEFAULT_ADMIN_CONFIG);
let lastFetch = 0;
const TTL_MS = 15000; // recarrega no máximo a cada 15s — evita 1 SELECT por tick

export async function getGameConfig() {
  const now = Date.now();
  if (now - lastFetch < TTL_MS) return cache;
  try {
    const row = await selectOne('game_config', { id: 1 });
    if (row && row.config) cache = sanitizeAdminConfig(row.config);
  } catch (e) {
    console.error('getGameConfig falhou, usando cache anterior', e.message);
  }
  lastFetch = now;
  return cache;
}
