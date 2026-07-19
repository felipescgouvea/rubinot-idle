import { G, ACCOUNT } from './gameStore.js?v=129';
import { BP_REWARDS, BP_PREMIUM_REWARDS, BP_PREMIUM_COST_RUBINI, bpTierForXp, dailyMissionsFor } from '../domain/progression.js?v=129';
import { ITEMS } from '../domain/items.js?v=140';
import { emit, EVENTS } from '../shared/eventBus.js?v=127';
import { addItemToInventory } from './inventoryCore.js?v=127';
import { saveGame } from './saveGameUseCase.js?v=129';
import { bpClaimOnServer, bpBuyPremiumOnServer } from '../infrastructure/authClient.js?v=136';
import { t } from '../i18n/i18n.js?v=143';

export function checkBpTier() {
  const newTier = bpTierForXp(G.bpXp);
  if (newTier > G.bpTier) {
    G.bpTier = newTier;
    emit(EVENTS.NOTIFY, { msg: t('battlepass.tierReached', { tier: G.bpTier }), type: 'success' });
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

// Chamada pelos pontos do jogo onde essas ações acontecem (matar criatura,
// completar task, vencer na Arena) — soma no contador do dia, sem se importar
// se a missão que usa essa trilha está ou não no sorteio de hoje.
export function bumpMissionProgress(track, amount = 1) {
  ensureDailyMissions();
  G.bpMissionProgress[track] = (G.bpMissionProgress[track] || 0) + amount;
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
