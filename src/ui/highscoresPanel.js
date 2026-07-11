import { G } from '../application/gameStore.js?v=25';
import { on, EVENTS } from '../shared/eventBus.js?v=25';
import { escapeHtml, notify } from './shared.js?v=25';
import { fetchHighscores, submitScore, invalidateHighscoresCache } from '../application/highscoresUseCases.js?v=25';

const VOC_LABEL = { knight: '🛡️ Knight', paladin: '🏹 Paladin', sorcerer: '🔮 Sorcerer', druid: '🌿 Druid' };

export async function renderHighscoresPanel() {
  const el = document.getElementById('highscores-content');
  if (!el) return;

  if (!G.playerName) {
    el.innerHTML = `
      <div class="hs-register">
        <p class="muted">Escolha um nome de personagem para entrar no ranking global. Todos os jogadores do Rubinot Idle competem entre si!</p>
        <div style="display:flex; gap:8px; max-width:380px">
          <input id="hs-name-input" type="text" maxlength="20" placeholder="Nome do personagem"
                 style="flex:1" onkeydown="if(event.key==='Enter')registerPlayerName(this.value)" />
          <button class="btn-blue" onclick="registerPlayerName(document.getElementById('hs-name-input').value)">Registrar</button>
        </div>
      </div>
      <div id="hs-table-area" style="margin-top:14px"></div>`;
  } else {
    el.innerHTML = `
      <p class="muted">Jogando como <strong>${G.playerName}</strong> — seu progresso é enviado ao ranking automaticamente (1x por minuto).</p>
      <div style="display:flex; gap:10px; margin-bottom:10px">
        <button class="btn-blue" onclick="refreshHighscoresClick()">📤 Atualizar agora</button>
      </div>
      <div id="hs-table-area"></div>`;
  }

  const area = document.getElementById('hs-table-area');
  area.innerHTML = '<p class="muted">Carregando ranking…</p>';
  const rows = await fetchHighscores();
  if (!rows) { area.innerHTML = '<p class="muted">Não foi possível carregar o ranking. Verifique sua conexão.</p>'; return; }
  if (!rows.length) { area.innerHTML = '<p class="muted">Ninguém no ranking ainda. Seja o primeiro!</p>'; return; }

  area.innerHTML = `
    <table class="hs-table">
      <thead><tr>
        <th>#</th><th>Nome</th><th>Vocação</th><th>Level</th><th>XP Total</th><th>Kills</th><th>Arena</th><th>Tasks</th><th>Mundo</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr class="${r.name === G.playerName ? 'hs-me' : ''}">
            <td>${i + 1}${i === 0 ? ' 👑' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : ''}</td>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${VOC_LABEL[r.vocation] || r.vocation}</td>
            <td>${r.level}</td>
            <td>${Number(r.xp).toLocaleString()}</td>
            <td>${Number(r.total_kills).toLocaleString()}</td>
            <td>${r.arena_points}</td>
            <td>${r.tasks_done}</td>
            <td style="text-transform:capitalize">${r.world}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

export async function refreshHighscoresClick() {
  const ok = await submitScore(true);
  if (ok) {
    notify('Score atualizado!', 'success');
    invalidateHighscoresCache();
    renderHighscoresPanel();
  }
}

export function wireHighscoresPanelEvents() {
  on(EVENTS.HIGHSCORES_PANEL, renderHighscoresPanel);
}
