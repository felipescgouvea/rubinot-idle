// Identidade do jogador no ranking global e envio/leitura de score. O
// "secret" é um UUID gerado no navegador — mesmo modelo de confiança usado
// pelo Market (ver marketUseCases.js).
import { G } from './gameStore.js?v=45';
import { XP_TABLE } from '../domain/character.js?v=45';
import { emit, EVENTS } from '../shared/eventBus.js?v=45';
import { submitScoreRequest, fetchHighscoresRequest } from '../infrastructure/highscoresApi.js?v=45';
import { saveGame } from './saveGameUseCase.js?v=45';

let lastSubmitAt = 0;
let highscoresCache = null;
let highscoresCacheAt = 0;

export function ensurePlayerSecret() {
  if (!G.playerSecret) {
    G.playerSecret = crypto.randomUUID();
    saveGame();
  }
}

export async function submitScore(force = false) {
  if (!G.playerName || !G.vocation) return false;
  const now = Date.now();
  if (!force && now - lastSubmitAt < 60000) return true; // no máx 1x/min
  lastSubmitAt = now;
  const tasksDone = Object.values(G.taskCompletion || {}).reduce((a, b) => a + b, 0);
  const totalXp = G.xp + XP_TABLE.slice(0, G.level - 1).reduce((a, b) => a + b, 0);

  const result = await submitScoreRequest({
    p_name: G.playerName,
    p_secret: G.playerSecret,
    p_vocation: G.vocation,
    p_level: G.level,
    p_xp: totalXp,
    p_kills: G.totalKills,
    p_arena: G.arenaPoints,
    p_tasks: tasksDone,
    p_world: G.currentWorld,
  });

  if (!result.ok) {
    if ((result.message || '').includes('em uso')) {
      emit(EVENTS.NOTIFY, { msg: 'Esse nome já pertence a outro jogador.', type: 'error' });
    }
    return false;
  }
  return true;
}

export async function registerPlayerName(name) {
  name = (name || '').trim();
  if (name.length < 3 || name.length > 20) {
    emit(EVENTS.NOTIFY, { msg: 'Nome deve ter entre 3 e 20 caracteres.', type: 'error' });
    return false;
  }
  ensurePlayerSecret();
  const prev = G.playerName;
  G.playerName = name;
  const ok = await submitScore(true);
  if (!ok) {
    G.playerName = prev;
    return false;
  }
  emit(EVENTS.NOTIFY, { msg: `Bem-vindo ao ranking, ${name}!`, type: 'success' });
  saveGame();
  emit(EVENTS.HIGHSCORES_PANEL);
  return true;
}

export async function fetchHighscores() {
  const now = Date.now();
  if (highscoresCache && now - highscoresCacheAt < 30000) return highscoresCache;
  const rows = await fetchHighscoresRequest();
  if (!rows) return null;
  highscoresCache = rows;
  highscoresCacheAt = now;
  return highscoresCache;
}

export function invalidateHighscoresCache() {
  highscoresCacheAt = 0;
}

// envio periódico junto do autosave
setInterval(() => { submitScore(); }, 90000);
