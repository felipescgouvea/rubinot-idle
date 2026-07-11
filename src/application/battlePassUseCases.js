import { G } from './gameStore.js?v=38';
import { BP_REWARDS, bpTierForXp, dailyMissionsFor } from '../domain/progression.js?v=38';
import { ITEMS } from '../domain/items.js?v=38';
import { emit, EVENTS } from '../shared/eventBus.js?v=38';
import { addItemToInventory } from './inventoryCore.js?v=38';
import { saveGame } from './saveGameUseCase.js?v=38';

export function checkBpTier() {
  const newTier = bpTierForXp(G.bpXp);
  if (newTier > G.bpTier) {
    G.bpTier = newTier;
    emit(EVENTS.NOTIFY, { msg: `🎖️ Battle Pass: Tier ${G.bpTier} alcançado!`, type: 'success' });
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Zera o progresso das missões diárias quando o dia muda — chamada antes de
// qualquer leitura/escrita em bpMissionProgress pra garantir que nunca conta
// progresso de ontem nas missões de hoje.
export function ensureDailyMissions() {
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
  emit(EVENTS.NOTIFY, { msg: `✅ Missão concluída: +${mission.xp} XP do Battle Pass!`, type: 'success' });
  emit(EVENTS.BATTLE_PASS_PANEL);
  saveGame();
}

export function claimBpReward(tier) {
  const r = BP_REWARDS.find(x => x.tier === tier);
  if (!r || G.bpTier < tier || G.bpClaimed.includes(tier)) return;
  G.bpClaimed.push(tier);
  if (r.type === 'gold') { G.gold += r.amount; emit(EVENTS.NOTIFY, { msg: `+${r.amount} 💰 coletado!`, type: 'success' }); }
  if (r.type === 'rubini') { G.rubini += r.amount; emit(EVENTS.NOTIFY, { msg: `+${r.amount} Rubini Coins!`, type: 'success' }); }
  if (r.type === 'item') { addItemToInventory(r.itemId); emit(EVENTS.NOTIFY, { msg: `Item recebido: ${ITEMS[r.itemId]?.name}!`, type: 'success' }); }
  emit(EVENTS.BATTLE_PASS_PANEL);
  emit(EVENTS.HEADER_STATS);
  saveGame();
}
