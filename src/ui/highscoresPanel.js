import { G } from '../application/gameStore.js?v=231';
import { MONSTERS } from '../domain/bestiary.js?v=249';
import { HIGHSCORE_CATEGORIES, highscoreCategory } from '../domain/highscoreCategories.js?v=228';
import { on, EVENTS } from '../shared/eventBus.js?v=229';
import { escapeHtml, notify, skillIconImg } from './shared.js?v=234';
import { fetchHighscores, submitScore, invalidateHighscoresCache } from '../application/highscoresUseCases.js?v=231';
import { t } from '../i18n/i18n.js?v=245';

const VOC_LABEL = { knight: '🛡️ Knight', paladin: '🏹 Paladin', sorcerer: '🔮 Sorcerer', druid: '🌿 Druid' };
const TOTAL_BESTIARY = Object.keys(MONSTERS).length;
// 🥇🥈🥉 pros 3 primeiros — mesmo padrão pra QUALQUER categoria (level, skill
// ou bestiário), não só o ranking geral.
const RANK_MEDAL = ['🥇', '🥈', '🥉'];

// Categorias de skill têm sprite real do Tibia (mesmos ids de
// domain/character.js: skills treináveis) — level/bestiário ficam de emoji,
// não têm equivalente real (ver skillIconFile em infrastructure/tibiaSprites.js).
const SKILL_CATEGORY_KEYS = new Set(['magic', 'fist', 'club', 'sword', 'axe', 'distance', 'shielding']);
function categoryIcon(c) {
  return SKILL_CATEGORY_KEYS.has(c.key) ? skillIconImg(c.key, c.icon, 'hs-category-icon-img') : c.icon;
}
// Rótulo da categoria: `label` literal quando existe (ex.: "Boss", igual nos
// dois idiomas), senão a chave i18n normal.
function categoryLabel(c) {
  return c.label || t(c.labelKey);
}

// Categoria ativa (estado só de UI, sobrevive a re-renders — mesmo padrão do
// RTC/Admin, ver ui/rtcPanel.js: activeRtcTab).
let activeCategory = 'level';
export function setHighscoresCategory(key) {
  if (!HIGHSCORE_CATEGORIES.some(c => c.key === key)) return;
  activeCategory = key;
  renderHighscoresPanel();
}

// O valor "principal" da linha, na categoria escolhida — pra colunas fora do
// 'level' (skills/bestiário), que não têm coluna própria fixa na tabela.
function categoryValue(category, row) {
  if (category.key === 'bestiary') return `${row.bestiary_count}/${TOTAL_BESTIARY}`;
  return row[category.column];
}

function rankCell(i) {
  return `${i + 1}${RANK_MEDAL[i] ? ' ' + RANK_MEDAL[i] : ''}`;
}

// Tabela "completa" (categoria Level): o perfil geral do jogador, igual ao
// ranking original. As demais categorias (skills/bestiário) usam uma tabela
// mais enxuta — ver skillOrBestiaryTable() abaixo.
function levelTable(rows) {
  return `
    <table class="hs-table">
      <thead><tr>
        <th>#</th><th>${t('highscores.colName')}</th><th>${t('highscores.colVocation')}</th><th>${t('highscores.colLevel')}</th><th>${t('highscores.colXp')}</th><th>${t('highscores.colKills')}</th><th>${t('highscores.colArena')}</th><th>${t('highscores.colTasks')}</th><th>${t('highscores.colWorld')}</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr class="${r.name === G.playerName ? 'hs-me' : ''}">
            <td>${rankCell(i)}</td>
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

function skillOrBestiaryTable(category, rows) {
  return `
    <table class="hs-table">
      <thead><tr>
        <th>#</th><th>${t('highscores.colName')}</th><th>${t('highscores.colVocation')}</th><th>${t('highscores.colLevel')}</th><th>${categoryIcon(category)} ${categoryLabel(category)}</th><th>${t('highscores.colWorld')}</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr class="${r.name === G.playerName ? 'hs-me' : ''}">
            <td>${rankCell(i)}</td>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${VOC_LABEL[r.vocation] || r.vocation}</td>
            <td>${r.level}</td>
            <td class="hs-highlight-col">${categoryValue(category, r)}</td>
            <td style="text-transform:capitalize">${r.world}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

export async function renderHighscoresPanel() {
  const el = document.getElementById('highscores-content');
  if (!el) return;
  const category = highscoreCategory(activeCategory);

  const categoryBtns = HIGHSCORE_CATEGORIES.map(c => `
    <button class="hs-category-btn ${c.key === category.key ? 'active' : ''}" onclick="setHighscoresCategory('${c.key}')">${categoryIcon(c)} ${categoryLabel(c)}</button>
  `).join('');

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
      <div class="hs-category-row">${categoryBtns}</div>
      <div id="hs-table-area" style="margin-top:14px"></div>`;
  } else {
    el.innerHTML = `
      <p class="muted">${t('highscores.playingAs', { name: `<strong>${G.playerName}</strong>` })}</p>
      <div style="display:flex; gap:10px; margin-bottom:10px">
        <button class="btn-blue" onclick="refreshHighscoresClick()">📤 ${t('highscores.refreshNow')}</button>
      </div>
      <div class="hs-category-row">${categoryBtns}</div>
      <div id="hs-table-area" style="margin-top:10px"></div>`;
  }

  const area = document.getElementById('hs-table-area');
  area.innerHTML = `<p class="muted">${t('highscores.loading')}</p>`;
  const rows = await fetchHighscores(category.key);
  if (!rows) { area.innerHTML = `<p class="muted">${t('highscores.loadError')}</p>`; return; }
  if (!rows.length) { area.innerHTML = `<p class="muted">${t('highscores.empty')}</p>`; return; }

  area.innerHTML = category.key === 'level' ? levelTable(rows) : skillOrBestiaryTable(category, rows);
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
