import { G } from '../application/gameStore.js?v=228';
import { BP_REWARDS, BP_PREMIUM_REWARDS, BP_PREMIUM_COST_RUBINI, BP_XP_PER_TIER } from '../domain/progression.js?v=228';
import { on, EVENTS } from '../shared/eventBus.js?v=226';
import { rewardIcon } from './uiIcons.js?v=229';
import { rubiniIconImg } from './shared.js?v=231';
import { currentMissions, currentWeeklyMissions, ensureSeason } from '../application/battlePassUseCases.js?v=227';
import { t } from '../i18n/i18n.js?v=242';

function bpRewardIcon(r) {
  return rewardIcon(r, 'bp-reward-sprite');
}

// Render genérico de uma lista de missões (diária ou semanal) num elemento.
function renderMissionsInto(elId, missions, progressObj, claimedArr, claimFn) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = missions.map(m => {
    const progress = Math.min(m.goal, progressObj[m.track] || 0);
    const pct = Math.round((progress / m.goal) * 100);
    const claimed = claimedArr.includes(m.id);
    const done = progress >= m.goal;
    return `<div class="bp-mission ${claimed ? 'claimed' : ''}">
      <div class="bp-mission-name">${t(m.name)}</div>
      <div class="bp-xp-row">
        <span style="font-size:11px;color:var(--muted)">${progress}/${m.goal}</span>
        <div class="bp-xp-bar-track" style="height:10px"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
        <span style="font-size:11px;color:var(--muted)">+${m.xp} XP</span>
      </div>
      <button class="bp-claim-btn" style="margin-top:6px" onclick="${claimFn}('${m.id}')" ${(!done || claimed) ? 'disabled' : ''}>
        ${claimed ? `✓ ${t('battlepass.claimed')}` : done ? t('battlepass.claim') : t('battlepass.inProgress')}
      </button>
    </div>`;
  }).join('');
}

export function renderBattlePassPanel() {
  ensureSeason(); // vira a temporada (reseta o BP) se o mês mudou
  const xpInTier = G.bpXp % BP_XP_PER_TIER;
  const pct = Math.round((xpInTier / BP_XP_PER_TIER) * 100);
  const seasonName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  document.getElementById('bp-progress-area').innerHTML = `
    <div><strong>${t('battlepass.currentTier', { tier: `<span style="color:var(--accent)">${G.bpTier}</span>` })}</strong> <span class="muted" style="font-size:12px">· 🎖️ Temporada de ${seasonName}</span></div>
    <div class="bp-xp-row">
      <span style="font-size:12px;color:var(--muted)">${xpInTier}/${BP_XP_PER_TIER} XP</span>
      <div class="bp-xp-bar-track"><div class="bp-xp-bar" style="width:${pct}%"></div></div>
      <span style="font-size:12px;color:var(--muted)">${pct}%</span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">${t('battlepass.xpHint')}</div>
  `;

  renderMissionsInto('bp-missions-area', currentMissions(), G.bpMissionProgress, G.bpMissionClaimed, 'claimMissionReward');
  renderMissionsInto('bp-weekly-area', currentWeeklyMissions(), G.bpWeeklyProgress, G.bpWeeklyClaimed, 'claimWeeklyMissionReward');

  // Banner da trilha premium (comprar / já ativa).
  const premEl = document.getElementById('bp-premium-banner');
  if (premEl) {
    premEl.innerHTML = G.bpPremium
      ? `<div class="bp-premium-on">⭐ Trilha Premium ativa</div>`
      : `<div class="bp-premium-off">⭐ Trilha Premium — recompensas melhores por tier <button class="bp-claim-btn" style="width:auto;padding:6px 14px" onclick="buyBpPremium()">Desbloquear (${BP_PREMIUM_COST_RUBINI} ${rubiniIconImg('inline-icon')})</button></div>`;
  }

  const track = document.getElementById('bp-rewards-track');
  const premByTier = {}; BP_PREMIUM_REWARDS.forEach(r => { premByTier[r.tier] = r; });
  const claimedPrem = G.bpClaimedPremium || [];
  track.innerHTML = BP_REWARDS.map(r => {
    const claimed = G.bpClaimed.includes(r.tier);
    const available = G.bpTier >= r.tier && !claimed;
    const p = premByTier[r.tier];
    const pClaimed = p && claimedPrem.includes(r.tier);
    const pAvailable = p && G.bpPremium && G.bpTier >= r.tier && !pClaimed;
    const premHtml = p ? `<div class="bp-reward bp-reward-premium ${pClaimed ? 'claimed' : ''} ${pAvailable ? 'available' : ''}" title="Trilha premium">
      <div class="bp-reward-icon">⭐ ${bpRewardIcon(p)}</div>
      <div class="bp-reward-name">${t(p.name)}</div>
      <button class="bp-claim-btn" onclick="claimBpReward(${r.tier}, 'premium')" ${!pAvailable ? 'disabled' : ''}>
        ${pClaimed ? '✓' : (G.bpPremium ? (G.bpTier >= r.tier ? t('battlepass.claim') : '🔒') : '🔒')}
      </button>
    </div>` : '';
    return `<div class="bp-reward-col">
      <div class="bp-reward ${claimed ? 'claimed' : ''} ${available ? 'available' : ''}">
        <div class="bp-reward-tier">${t('battlepass.tierLabel', { tier: r.tier })}</div>
        <div class="bp-reward-icon">${bpRewardIcon(r)}</div>
        <div class="bp-reward-name">${t(r.name)}</div>
        <button class="bp-claim-btn" onclick="claimBpReward(${r.tier})" ${!available ? 'disabled' : ''}>
          ${claimed ? '✓' : available ? t('battlepass.claim') : '🔒'}
        </button>
      </div>
      ${premHtml}
    </div>`;
  }).join('');
}

export function wireBattlePassPanelEvents() {
  on(EVENTS.BATTLE_PASS_PANEL, renderBattlePassPanel);
}
