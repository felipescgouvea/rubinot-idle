// Identidade do jogador no ranking global e envio/leitura de score. O
// "secret" é um UUID gerado no navegador — mesmo modelo de confiança usado
// pelo Market (ver marketUseCases.js).
import { G } from './gameStore.js?v=129';
import { XP_TABLE } from '../domain/character.js?v=156';
import { MONSTERS } from '../domain/bestiary.js?v=136';
import { emit, EVENTS } from '../shared/eventBus.js?v=126';
import { submitScoreRequest, fetchHighscoresRequest } from '../infrastructure/highscoresApi.js?v=127';
import { saveGame } from './saveGameUseCase.js?v=129';
import { t } from '../i18n/i18n.js?v=141';

let lastSubmitAt = 0;
// Cache por CATEGORIA (level/skill/bestiário pedem ordenações diferentes do
// mesmo ranking — ver ui/highscoresPanel.js) — cada uma com seu próprio relógio.
const highscoresCache = new Map();

export function ensurePlayerSecret() {
  if (!G.playerSecret) {
    G.playerSecret = crypto.randomUUID();
    saveGame();
  }
}

// Quantas criaturas DISTINTAS o jogador já matou ao menos 1 vez, do elenco
// atual do bestiário (kill counters de monstros removidos/renomeados não contam
// mais — ver domain/bestiary.js: MONSTERS). É o número que representa
// "progresso no bestiário" pro ranking (ver ui/highscoresPanel.js).
export function bestiaryProgressCount() {
  return Object.keys(G.killCounters || {}).filter(id => MONSTERS[id]).length;
}

export async function submitScore(force = false) {
  if (!G.playerName || !G.vocation) return false;
  const now = Date.now();
  if (!force && now - lastSubmitAt < 60000) return true; // no máx 1x/min
  lastSubmitAt = now;
  const tasksDone = Object.values(G.taskCompletion || {}).reduce((a, b) => a + b, 0);
  const totalXp = G.xp + XP_TABLE.slice(0, G.level - 1).reduce((a, b) => a + b, 0);
  const sk = G.sk || {};

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
    p_skill_magic: (sk.magic && sk.magic.lv) || 0,
    p_skill_fist: (sk.fist && sk.fist.lv) || 10,
    p_skill_club: (sk.club && sk.club.lv) || 10,
    p_skill_sword: (sk.sword && sk.sword.lv) || 10,
    p_skill_axe: (sk.axe && sk.axe.lv) || 10,
    p_skill_distance: (sk.distance && sk.distance.lv) || 10,
    p_skill_shielding: (sk.shielding && sk.shielding.lv) || 10,
    p_bestiary_count: bestiaryProgressCount(),
  });

  if (!result.ok) {
    if ((result.message || '').includes('em uso')) {
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
  ensurePlayerSecret();
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
  const rows = await fetchHighscoresRequest(category);
  if (!rows) return null;
  highscoresCache.set(category, { rows, at: now });
  return rows;
}

export function invalidateHighscoresCache() {
  highscoresCache.clear();
}

// envio periódico junto do autosave
setInterval(() => { submitScore(); }, 90000);
