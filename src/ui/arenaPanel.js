import { G } from '../application/gameStore.js?v=27';
import { VOCATIONS } from '../domain/character.js?v=27';
import { ARENA_DIVISIONS } from '../domain/progression.js?v=27';
import { startArenaBattle } from '../application/arenaUseCases.js?v=27';

function renderArenaSummary() {
  const divIndex = Math.min(ARENA_DIVISIONS.length - 1, Math.floor(G.arenaPoints / 100));
  const division = ARENA_DIVISIONS[divIndex];
  document.getElementById('arena-info').innerHTML = `
    <div class="arena-stat"><div class="arena-stat-val">${division}</div><div class="arena-stat-lbl">Divisão</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaPoints}</div><div class="arena-stat-lbl">Pontos Prestige</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaWins}</div><div class="arena-stat-lbl">Vitórias</div></div>
    <div class="arena-stat"><div class="arena-stat-val">${G.arenaLosses}</div><div class="arena-stat-lbl">Derrotas</div></div>
  `;
}

// Recria o "card de VS" com nome/log em branco. Chamada só ao entrar na aba —
// re-rodar isso depois de uma batalha apagaria o log antes do jogador ler.
function renderArenaBattleShell() {
  const locked = G.level < 30;
  document.getElementById('arena-battle-area').innerHTML = locked
    ? `<p style="color:var(--muted);text-align:center;padding:20px">🔒 Arena requer Nível 30+. (Você está no nível ${G.level})</p>`
    : `
      <div class="arena-vs">
        <div class="arena-fighter">
          <div class="arena-fighter-name">${G.vocation ? VOCATIONS[G.vocation].icon : '⚔️'} Você</div>
          <div style="font-size:12px;color:var(--muted)">Lv ${G.level} — ${G.arenaPoints} pts</div>
          <div class="bar-row" style="margin-top:8px"><div class="bar-track" style="flex:1"><div class="bar hp-bar" style="width:100%"></div></div></div>
        </div>
        <div class="arena-vs-sep">VS</div>
        <div class="arena-fighter enemy">
          <div class="arena-fighter-name" id="arena-enemy-name">???</div>
          <div style="font-size:12px;color:var(--muted)" id="arena-enemy-info">Aguardando...</div>
        </div>
      </div>
      <button class="arena-btn" onclick="startArenaBattle()">⚔️ Buscar Batalha</button>
      <div class="arena-log" id="arena-log"></div>
    `;
}

export function renderArenaPanel() {
  renderArenaSummary();
  renderArenaBattleShell();
}

// Handler do botão "Buscar Batalha": chama o caso de uso, depois pinta só o
// que mudou (resumo + nome do inimigo + log) sem recriar o shell — é isso que
// garante que o jogador realmente veja o log da luta.
export async function handleArenaBattleClick() {
  const result = await startArenaBattle();
  renderArenaSummary();

  const nameEl = document.getElementById('arena-enemy-name');
  const infoEl = document.getElementById('arena-enemy-info');
  const logEl = document.getElementById('arena-log');
  if (!nameEl || !infoEl || !logEl) return; // saiu da aba Arena antes da batalha resolver

  nameEl.textContent = `⚔️ ${result.enemyName}`;
  infoEl.textContent = `Lv ${result.enemyLevel} — ${result.enemyPts} pts`;
  logEl.innerHTML = result.logLines.map(line => `<div>${line}</div>`).join('');
  logEl.scrollTop = logEl.scrollHeight;
}
