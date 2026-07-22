// Identidade do jogador no ranking global e envio/leitura de score. O
// servidor (Railway) lê level/xp/kills/skills reais de player_stats/
// player_skills — o cliente só reporta o que ainda não é autoritativo
// (arena/tasks/bestiário, ver server/src/index.js: /highscores/submit).
import { G, ACCOUNT } from './gameStore.js?v=225';
import { MONSTERS } from '../domain/bestiary.js?v=243';
import { emit, EVENTS } from '../shared/eventBus.js?v=223';
import { submitHighscoreOnServer, fetchHighscoresOnServer } from '../infrastructure/authClient.js';
import { saveGame } from './saveGameUseCase.js?v=225';
import { t } from '../i18n/i18n.js?v=239';

let lastSubmitAt = 0;
// Cache por CATEGORIA (level/skill/bestiário pedem ordenações diferentes do
// mesmo ranking — ver ui/highscoresPanel.js) — cada uma com seu próprio relógio.
const highscoresCache = new Map();

// Quantas criaturas DISTINTAS o jogador já matou ao menos 1 vez, do elenco
// atual do bestiário (kill counters de monstros removidos/renomeados não contam
// mais — ver domain/bestiary.js: MONSTERS). É o número que representa
// "progresso no bestiário" pro ranking (ver ui/highscoresPanel.js).
function bestiaryProgressCount() {
  return Object.keys(G.killCounters || {}).filter(id => MONSTERS[id]).length;
}

export async function submitScore(force = false) {
  if (!G.playerName || !G.vocation) return false;
  const now = Date.now();
  if (!force && now - lastSubmitAt < 60000) return true; // no máx 1x/min
  lastSubmitAt = now;
  const tasksDone = Object.values(G.taskCompletion || {}).reduce((a, b) => a + b, 0);

  const result = await submitHighscoreOnServer(ACCOUNT.activeSlot, {
    playerName: G.playerName,
    vocation: G.vocation,   // reserva: o servidor prefere a da última caçada
    arenaPoints: G.arenaPoints,
    tasksDone,
    world: G.currentWorld,
    bestiaryCount: bestiaryProgressCount(),
  });

  if (!result.ok) {
    if ((result.error || '').includes('em uso')) {
      emit(EVENTS.NOTIFY, { msg: t('highscores.nameTaken'), type: 'error' });
    }
    return false;
  }
  return true;
}

export async function registerPlayerName(name) {
  name = (name || '').trim();
  if (name.length < 3 || name.length > 20) {
    emit(EVENTS.NOTIFY, { msg: t('highscores.nameLength'), type: 'error' });
    return false;
  }
  const prev = G.playerName;
  G.playerName = name;
  const ok = await submitScore(true);
  if (!ok) {
    G.playerName = prev;
    return false;
  }
  emit(EVENTS.NOTIFY, { msg: t('highscores.welcome', { name }), type: 'success' });
  saveGame();
  emit(EVENTS.HIGHSCORES_PANEL);
  emit(EVENTS.CHAR_INFO); // atualiza o nome na barra de status do personagem (ver ui/characterPanel.js)
  return true;
}

// `category` é uma chave de HIGHSCORE_CATEGORIES (ver ui/highscoresPanel.js) —
// cada uma ordena o MESMO ranking por uma coluna diferente (level, uma skill,
// ou bestiário). Default 'level' preserva o comportamento de antes.
export async function fetchHighscores(category = 'level') {
  const now = Date.now();
  const cached = highscoresCache.get(category);
  if (cached && now - cached.at < 30000) return cached.rows;
  const result = await fetchHighscoresOnServer(category);
  if (!result.ok) return null;
  highscoresCache.set(category, { rows: result.rows, at: now });
  return result.rows;
}

export function invalidateHighscoresCache() {
  highscoresCache.clear();
}

// envio periódico junto do autosave
setInterval(() => { submitScore(); }, 90000);
