import { G } from '../application/gameStore.js?v=21';
import { BP_REWARDS, BP_XP_PER_TIER } from '../domain/progression.js?v=21';
import { on, EVENTS } from '../shared/eventBus.js?v=21';
import { itemIconImg } from './shared.js?v=21';

export function renderBattlePassPanel() {
  const xpInTier = G.bpXp % BP_XP_PER_TIER;
  const pct = Math.round((xpInTier / BP_XP_PER_TIER) * 100);

  document.getElementById('bp-progress-area').innerHTML = `
    <div><strong>Tier Atual: <span style="color:var(--accent)">${G.bpTier}</span></strong></div>
    <div class="bp-xp-row">
      <span style="font-size:12px;color:var(--muted)">${xpInTier}/${BP_XP_PER_TIER} XP</span>
      <div class="bp-xp-bar-track"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
      <span style="font-size:12px;color:var(--muted)">${pct}%</span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">XP do Battle Pass ganho ao matar monstros.</div>
  `;

  const track = document.getElementById('bp-rewards-track');
  track.innerHTML = BP_REWARDS.map(r => {
    const claimed = G.bpClaimed.includes(r.tier);
    const available = G.bpTier >= r.tier && !claimed;
    return `<div class="bp-reward ${claimed ? 'claimed' : ''} ${available ? 'available' : ''}">
      <div class="bp-reward-tier">Tier ${r.tier}</div>
      <div class="bp-reward-icon">${r.type === 'item' ? itemIconImg(r.itemId) : r.icon}</div>
      <div class="bp-reward-name">${r.name}</div>
      <button class="bp-claim-btn" onclick="claimBpReward(${r.tier})" ${!available ? 'disabled' : ''}>
        ${claimed ? '✓' : available ? 'Coletar' : '🔒'}
      </button>
    </div>`;
  }).join('');
}

export function wireBattlePassPanelEvents() {
  on(EVENTS.BATTLE_PASS_PANEL, renderBattlePassPanel);
}
