import { G } from './gameStore.js?v=15';
import { BP_REWARDS, bpTierForXp } from '../domain/progression.js?v=15';
import { ITEMS } from '../domain/items.js?v=15';
import { emit, EVENTS } from '../shared/eventBus.js?v=15';
import { addItemToInventory } from './inventoryCore.js?v=15';
import { saveGame } from './saveGameUseCase.js?v=15';

export function checkBpTier() {
  const newTier = bpTierForXp(G.bpXp);
  if (newTier > G.bpTier) {
    G.bpTier = newTier;
    emit(EVENTS.NOTIFY, { msg: `🎖️ Battle Pass: Tier ${G.bpTier} alcançado!`, type: 'success' });
  }
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
