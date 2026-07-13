import { G } from '../application/gameStore.js?v=126';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { escapeHtml, notify } from './shared.js?v=125';
import { fetchHighscores, submitScore, invalidateHighscoresCache } from '../application/highscoresUseCases.js?v=125';
import { t } from '../i18n/i18n.js?v=127';

const VOC_LABEL = { knight: '🛡️ Knight', paladin: '🏹 Paladin', sorcerer: '🔮 Sorcerer', druid: '🌿 Druid' };

export async function renderHighscoresPanel() {
  const el = document.getElementById('highscores-content');
  if (!el) return;

  if (!G.playerName) {
    el.innerHTML = `
      <div class="hs-register">
        <p class="muted">${t('highscores.chooseNameIntro')}</p>
        <div style="display:flex; gap:8px; max-width:380px">
          <input id="hs-name-input" type="text" maxlength="20" placeholder="${t('highscores.namePlaceholder')}"
                 style="flex:1" onkeydown="if(event.key==='Enter')registerPlayerName(this.value)" />
          <button class="btn-blue" onclick="registerPlayerName(document.getElementById('hs-name-input').value)">${t('highscores.register')}</button>
        </div>
      </div>
      <div id="hs-table-area" style="margin-top:14px"></div>`;
  } else {
    el.innerHTML = `
      <p class="muted">${t('highscores.playingAs', { name: `<strong>${G.playerName}</strong>` })}</p>
      <div style="display:flex; gap:10px; margin-bottom:10px">
        <button class="btn-blue" onclick="refreshHighscoresClick()">📤 ${t('highscores.refreshNow')}</button>
      </div>
      <div id="hs-table-area"></div>`;
  }

  const area = document.getElementById('hs-table-area');
  area.innerHTML = `<p class="muted">${t('highscores.loading')}</p>`;
  const rows = await fetchHighscores();
  if (!rows) { area.innerHTML = `<p class="muted">${t('highscores.loadError')}</p>`; return; }
  if (!rows.length) { area.innerHTML = `<p class="muted">${t('highscores.empty')}</p>`; return; }

  area.innerHTML = `
    <table class="hs-table">
      <thead><tr>
        <th>#</th><th>${t('highscores.colName')}</th><th>${t('highscores.colVocation')}</th><th>${t('highscores.colLevel')}</th><th>${t('highscores.colXp')}</th><th>${t('highscores.colKills')}</th><th>${t('highscores.colArena')}</th><th>${t('highscores.colTasks')}</th><th>${t('highscores.colWorld')}</th>
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
    notify(t('highscores.scoreUpdated'), 'success');
    invalidateHighscoresCache();
    renderHighscoresPanel();
  }
}

export function wireHighscoresPanelEvents() {
  on(EVENTS.HIGHSCORES_PANEL, renderHighscoresPanel);
}
