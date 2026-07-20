import { G, ACCOUNT } from './gameStore.js?v=133';
import { BP_REWARDS, BP_PREMIUM_REWARDS, BP_PREMIUM_COST_RUBINI, bpTierForXp, dailyMissionsFor, weeklyMissionsFor, bpWeekId, currentBpSeason } from '../domain/progression.js?v=134';
import { ITEMS } from '../domain/items.js?v=144';
import { emit, EVENTS } from '../shared/eventBus.js?v=131';
import { addItemToInventory } from './inventoryCore.js?v=131';
import { saveGame } from './saveGameUseCase.js?v=133';
import { bpClaimOnServer, bpBuyPremiumOnServer } from '../infrastructure/authClient.js?v=140';
import { t } from '../i18n/i18n.js?v=147';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Fim de temporada: a cada mês novo (ver currentBpSeason) o Battle Pass reseta —
// tier/xp/resgates/premium zeram e uma nova temporada começa. O lado premium
// (bp em player_stats) reseta no servidor de forma preguiçosa no próximo
// /bp/claim ou /bp/buy-premium (checa bp.season). Aqui zeramos o estado local.
export function ensureSeason() {
  const season = currentBpSeason(todayStr());
  if (G.bpSeason === season) return;
  const first = G.bpSeason == null;
  G.bpSeason = season;
  G.bpXp = 0; G.bpTier = 0; G.bpClaimed = []; G.bpClaimedPremium = []; G.bpPremium = false;
  if (!first) emit(EVENTS.NOTIFY, { msg: '🎖️ Nova temporada do Battle Pass! O progresso foi reiniciado.', type: 'info' });
}

export function checkBpTier() {
  ensureSeason();
  const newTier = bpTierForXp(G.bpXp);
  if (newTier > G.bpTier) {
    G.bpTier = newTier;
    emit(EVENTS.NOTIFY, { msg: t('battlepass.tierReached', { tier: G.bpTier }), type: 'success' });
  }
}

// Zera o progresso das missões diárias quando o dia muda — chamada antes de
// qualquer leitura/escrita em bpMissionProgress pra garantir que nunca conta
// progresso de ontem nas missões de hoje.
function ensureDailyMissions() {
  const today = todayStr();
  if (G.bpMissionDate === today) return;
  G.bpMissionDate = today;
  G.bpMissionProgress = { kills: 0, gold: 0, tasks: 0, arenaWins: 0 };
  G.bpMissionClaimed = [];
}

export function currentMissions() {
  ensureDailyMissions();
  return dailyMissionsFor(G.bpMissionDate);
}

// Missões SEMANAIS: mesmo esquema, mas o contador zera por semana (ver bpWeekId).
function ensureWeeklyMissions() {
  const wk = bpWeekId(todayStr());
  if (G.bpWeekId === wk) return;
  G.bpWeekId = wk;
  G.bpWeeklyProgress = { kills: 0, gold: 0, tasks: 0, arenaWins: 0 };
  G.bpWeeklyClaimed = [];
}

export function currentWeeklyMissions() {
  ensureWeeklyMissions();
  return weeklyMissionsFor(todayStr());
}

// Chamada pelos pontos do jogo (matar/task/arena) — soma no contador do dia E
// da semana, sem se importar se a missão está no sorteio de hoje/semana.
export function bumpMissionProgress(track, amount = 1) {
  ensureDailyMissions();
  ensureWeeklyMissions();
  G.bpMissionProgress[track] = (G.bpMissionProgress[track] || 0) + amount;
  G.bpWeeklyProgress[track] = (G.bpWeeklyProgress[track] || 0) + amount;
}

// Resgate de uma missão SEMANAL — concede bpXp (mesma matemática da diária).
export function claimWeeklyMissionReward(missionId) {
  ensureWeeklyMissions();
  const mission = currentWeeklyMissions().find(m => m.id === missionId);
  if (!mission || G.bpWeeklyClaimed.includes(missionId)) return;
  if ((G.bpWeeklyProgress[mission.track] || 0) < mission.goal) return;
  G.bpWeeklyClaimed.push(missionId);
  G.bpXp += mission.xp;
  checkBpTier();
  emit(EVENTS.NOTIFY, { msg: t('battlepass.missionComplete', { xp: mission.xp }), type: 'success' });
  emit(EVENTS.BATTLE_PASS_PANEL);
  saveGame();
}

export function claimMissionReward(missionId) {
  ensureDailyMissions();
  const mission = currentMissions().find(m => m.id === missionId);
  if (!mission || G.bpMissionClaimed.includes(missionId)) return;
  const progress = G.bpMissionProgress[mission.track] || 0;
  if (progress < mission.goal) return;
  G.bpMissionClaimed.push(missionId);
  G.bpXp += mission.xp;
  checkBpTier();
  emit(EVENTS.NOTIFY, { msg: t('battlepass.missionComplete', { xp: mission.xp }), type: 'success' });
  emit(EVENTS.BATTLE_PASS_PANEL);
  saveGame();
}

// Resgate AUTORITATIVO (server-validado) — o grant de gold/item/rubini acontece
// no servidor (ver /bp/claim), então não é mais revertido pelo reconcile (bug
// antigo: recompensa client-side sumia). kind: 'free' (padrão) ou 'premium'.
export async function claimBpReward(tier, kind = 'free') {
  const rewards = kind === 'premium' ? BP_PREMIUM_REWARDS : BP_REWARDS;
  const r = rewards.find(x => x.tier === tier);
  const claimedList = kind === 'premium' ? (G.bpClaimedPremium || (G.bpClaimedPremium = [])) : G.bpClaimed;
  if (!r || G.bpTier < tier || claimedList.includes(tier)) return;
  if (kind === 'premium' && !G.bpPremium) { emit(EVENTS.NOTIFY, { msg: '🔒 Requer a trilha premium.', type: 'error' }); return; }
  const res = await bpClaimOnServer(ACCOUNT.activeSlot, tier, kind, G.bpXp);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  claimedList.push(tier);
  if (res.gold != null) G.gold = res.gold;
  if (res.rubini != null) G.rubini = res.rubini;
  if (res.itemId) { addItemToInventory(res.itemId); emit(EVENTS.NOTIFY, { msg: t('battlepass.itemReceived', { item: ITEMS[res.itemId]?.name }), type: 'success' }); emit(EVENTS.INVENTORY); }
  else if (r.type === 'gold') emit(EVENTS.NOTIFY, { msg: t('battlepass.goldCollected', { amount: r.amount }), type: 'success' });
  else if (r.type === 'rubini') emit(EVENTS.NOTIFY, { msg: t('battlepass.rubiniCollected', { amount: r.amount }), type: 'success' });
  emit(EVENTS.BATTLE_PASS_PANEL);
  emit(EVENTS.HEADER_STATS);
  saveGame();
}

// Comprar a trilha premium (paga em Rubini Coins, validado no servidor).
export async function buyBpPremium() {
  if (G.bpPremium) return;
  if ((G.rubini || 0) < BP_PREMIUM_COST_RUBINI) { emit(EVENTS.NOTIFY, { msg: `Requer ${BP_PREMIUM_COST_RUBINI} Rubini Coins.`, type: 'error' }); return; }
  const res = await bpBuyPremiumOnServer(ACCOUNT.activeSlot);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: `⚠️ ${res.error}`, type: 'error' }); return; }
  G.bpPremium = true;
  if (res.rubini != null) G.rubini = res.rubini;
  emit(EVENTS.NOTIFY, { msg: '⭐ Trilha premium desbloqueada!', type: 'success' });
  emit(EVENTS.BATTLE_PASS_PANEL);
  emit(EVENTS.HEADER_STATS);
  saveGame();
}
