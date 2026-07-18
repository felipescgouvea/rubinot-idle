import { G } from '../application/gameStore.js?v=129';
import { VOCATIONS } from '../domain/character.js?v=156';
import { ARENA_DIVISIONS, ARENA_DIVISION_REWARDS, ARENA_DAILY_LIMIT, arenaDivisionForPoints } from '../domain/progression.js?v=128';
import { startArenaBattle, arenaAttemptsLeft, claimArenaDivisionReward } from '../application/arenaUseCases.js?v=126';
import { itemIconImg, goldIconImg, rubiniIconImg } from './shared.js?v=132';
import { t } from '../i18n/i18n.js?v=143';

function divisionRewardIcon(r) {
  if (r.type === 'gold') return goldIconImg('inline-icon');
  if (r.type === 'rubini') return rubiniIconImg('inline-icon');
  if (r.type === 'item') return itemIconImg(r.itemId, 'inline-icon');
  return '';
}

function renderArenaSummary() {
  const division = arenaDivisionForPoints(G.arenaPoints);
  document.getElementById('arena-info').innerHTML = `
    <div class="arena-stat"><div class="arena-stat-val">${division}</div><div class="arena-stat-lbl">${t('arena.division')}</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaPoints}</div><div class="arena-stat-lbl">${t('arena.prestigePoints')}</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaWins}</div><div class="arena-stat-lbl">${t('arena.wins')}</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaLosses}</div><div class="arena-stat-lbl">${t('arena.losses')}</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaStreak || 0}🔥</div><div class="arena-stat-lbl">${t('arena.streak')}</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${arenaAttemptsLeft()}/${ARENA_DAILY_LIMIT}</div><div class="arena-stat-lbl">${t('arena.fightsToday')}</div></div>
  `;

  const currentIdx = ARENA_DIVISIONS.indexOf(division);
  document.getElementById('arena-division-rewards').innerHTML = ARENA_DIVISIONS.map((div, i) => {
    const reward = ARENA_DIVISION_REWARDS[div];
    const reached = i <= currentIdx;
    const claimed = G.arenaDivisionsClaimed.includes(div);
    return `<div class="bp-reward ${claimed ? 'claimed' : ''} ${reached && !claimed ? 'available' : ''}">
      <div class="bp-reward-tier">${div}</div>
      <div class="bp-reward-icon">${divisionRewardIcon(reward)}</div>
      <button class="bp-claim-btn" onclick="handleClaimArenaDivision('${div}')" ${(!reached || claimed) ? 'disabled' : ''}>
        ${claimed ? '✓' : reached ? t('arena.claim') : '🔒'}
      </button>
    </div>`;
  }).join('');
}

// Recria o "card de VS" com nome/log em branco. Chamada só ao entrar na aba —
// re-rodar isso depois de uma batalha apagaria o log antes do jogador ler.
function renderArenaBattleShell() {
  const locked = G.level < 30;
  const noAttempts = arenaAttemptsLeft() <= 0;
  document.getElementById('arena-battle-area').innerHTML = locked
    ? `<p style="color:var(--muted);text-align:center;padding:20px">🔒 ${t('arena.levelRequirement', { level: G.level })}</p>`
    : `
      <div class="arena-vs">
        <div class="arena-fighter">
          <div class="arena-fighter-name">${G.vocation ? VOCATIONS[G.vocation].icon : '⚔️'} ${t('arena.you')}</div>
          <div style="font-size:12px;color:var(--muted)">${t('arena.levelPoints', { level: G.level, points: G.arenaPoints })}</div>
          <div class="bar-row" style="margin-top:8px"><div class="bar-track" style="flex:1"><div class="bar hp-bar" style="width:100%"></div></div></div>
        </div>
        <div class="arena-vs-sep">${t('arena.vs')}</div>
        <div class="arena-fighter enemy">
          <div class="arena-fighter-name" id="arena-enemy-name">???</div>
          <div style="font-size:12px;color:var(--muted)" id="arena-enemy-info">${t('arena.waiting')}</div>
        </div>
      </div>
      <button class="arena-btn" onclick="startArenaBattle()" ${noAttempts ? 'disabled' : ''}>${noAttempts ? `⏳ ${t('arena.noFightsToday')}` : `⚔️ ${t('arena.findBattle')}`}</button>
      <div class="arena-log" id="arena-log"></div>
    `;
}

export function renderArenaPanel() {
  renderArenaSummary();
  renderArenaBattleShell();
}

export function handleClaimArenaDivision(division) {
  claimArenaDivisionReward(division);
  renderArenaSummary();
}

// Handler do botão "Buscar Batalha": chama o caso de uso, depois pinta só o
// que mudou (resumo + nome do inimigo + log) sem recriar o shell — é isso que
// garante que o jogador realmente veja o log da luta.
export async function handleArenaBattleClick() {
  const result = await startArenaBattle();
  renderArenaSummary();
  if (result.noAttemptsLeft) { renderArenaBattleShell(); return; }
  if (result.attemptsLeft === 0) renderArenaBattleShell(); // reflete o botão desabilitado na última luta do dia

  const nameEl = document.getElementById('arena-enemy-name');
  const infoEl = document.getElementById('arena-enemy-info');
  const logEl = document.getElementById('arena-log');
  if (!nameEl || !infoEl || !logEl) return; // saiu da aba Arena antes da batalha resolver

  nameEl.textContent = `⚔️ ${result.enemyName}`;
  infoEl.textContent = t('arena.levelPoints', { level: result.enemyLevel, points: result.enemyPts });
  logEl.innerHTML = result.logLines.map(line => `<div>${line}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
}
