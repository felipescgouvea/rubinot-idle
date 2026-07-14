import { G } from '../application/gameStore.js?v=126';
import { BP_REWARDS, BP_XP_PER_TIER } from '../domain/progression.js?v=127';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { itemIconImg, goldIconImg, rubiniIconImg } from './shared.js?v=128';
import { currentMissions } from '../application/battlePassUseCases.js?v=125';
import { t } from '../i18n/i18n.js?v=135';

function bpRewardIcon(r) {
  if (r.type === 'item') return itemIconImg(r.itemId);
  if (r.type === 'gold') return goldIconImg();
  if (r.type === 'rubini') return rubiniIconImg();
  return r.icon;
}

function renderBpMissions() {
  const el = document.getElementById('bp-missions-area');
  if (!el) return;
  const missions = currentMissions();
  el.innerHTML = missions.map(m => {
    const progress = Math.min(m.goal, G.bpMissionProgress[m.track] || 0);
    const pct = Math.round((progress / m.goal) * 100);
    const claimed = G.bpMissionClaimed.includes(m.id);
    const done = progress >= m.goal;
    return `<div class="bp-mission ${claimed ? 'claimed' : ''}">
      <div class="bp-mission-name">${t(m.name)}</div>
      <div class="bp-xp-row">
        <span style="font-size:11px;color:var(--muted)">${progress}/${m.goal}</span>
        <div class="bp-xp-bar-track" style="height:10px"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
        <span style="font-size:11px;color:var(--muted)">+${m.xp} XP</span>
      </div>
      <button class="bp-claim-btn" style="margin-top:6px" onclick="claimMissionReward('${m.id}')" ${(!done || claimed) ? 'disabled' : ''}>
        ${claimed ? `✓ ${t('battlepass.claimed')}` : done ? t('battlepass.claim') : t('battlepass.inProgress')}
      </button>
    </div>`;
  }).join('');
}

export function renderBattlePassPanel() {
  const xpInTier = G.bpXp % BP_XP_PER_TIER;
  const pct = Math.round((xpInTier / BP_XP_PER_TIER) * 100);

  document.getElementById('bp-progress-area').innerHTML = `
    <div><strong>${t('battlepass.currentTier', { tier: `<span style="color:var(--accent)">${G.bpTier}</span>` })}</strong></div>
    <div class="bp-xp-row">
      <span style="font-size:12px;color:var(--muted)">${xpInTier}/${BP_XP_PER_TIER} XP</span>
      <div class="bp-xp-bar-track"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
      <span style="font-size:12px;color:var(--muted)">${pct}%</span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">${t('battlepass.xpHint')}</div>
  `;

  renderBpMissions();

  const track = document.getElementById('bp-rewards-track');
  track.innerHTML = BP_REWARDS.map(r => {
    const claimed = G.bpClaimed.includes(r.tier);
    const available = G.bpTier >= r.tier && !claimed;
    return `<div class="bp-reward ${claimed ? 'claimed' : ''} ${available ? 'available' : ''}">
      <div class="bp-reward-tier">${t('battlepass.tierLabel', { tier: r.tier })}</div>
      <div class="bp-reward-icon">${bpRewardIcon(r)}</div>
      <div class="bp-reward-name">${t(r.name)}</div>
      <button class="bp-claim-btn" onclick="claimBpReward(${r.tier})" ${!available ? 'disabled' : ''}>
        ${claimed ? '✓' : available ? t('battlepass.claim') : '🔒'}
      </button>
    </div>`;
  }).join('');
}

export function wireBattlePassPanelEvents() {
  on(EVENTS.BATTLE_PASS_PANEL, renderBattlePassPanel);
}
