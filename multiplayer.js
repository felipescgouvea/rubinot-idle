// ===== RUBINOT IDLE — MULTIPLAYER (Highscores globais via Supabase) =====
// Leitura pública do ranking; escrita apenas via RPC com segredo por jogador.

const MP = {
  url: 'https://tyjmyfpdqyjjxejudfmr.supabase.co',
  key: 'sb_publishable_-Y4w7gioJ_cj6SwkNsiOpQ_NSEbg6VE',
  lastSubmit: 0,
  cache: null,
  cacheAt: 0,
};

function mpHeaders() {
  return {
    'apikey': MP.key,
    'Authorization': `Bearer ${MP.key}`,
    'Content-Type': 'application/json',
  };
}

// ---- Identidade do jogador ----

function ensurePlayerSecret() {
  if (!G.playerSecret) {
    G.playerSecret = crypto.randomUUID();
    saveGame();
  }
}

async function registerPlayerName(name) {
  name = (name || '').trim();
  if (name.length < 3 || name.length > 20) {
    notify('Nome deve ter entre 3 e 20 caracteres.', 'error');
    return false;
  }
  ensurePlayerSecret();
  const prev = G.playerName;
  G.playerName = name;
  const ok = await submitScore(true);
  if (!ok) {
    G.playerName = prev;
    return false;
  }
  notify(`Bem-vindo ao ranking, ${name}!`, 'success');
  saveGame();
  renderHighscoresPanel();
  return true;
}

// ---- Envio de score ----

async function submitScore(force = false) {
  if (!G.playerName || !G.vocation) return false;
  const now = Date.now();
  if (!force && now - MP.lastSubmit < 60000) return true; // no máx 1x/min
  MP.lastSubmit = now;
  const tasksDone = Object.values(G.taskCompletion || {}).reduce((a, b) => a + b, 0);
  try {
    const res = await fetch(`${MP.url}/rest/v1/rpc/rubinot_idle_submit`, {
      method: 'POST',
      headers: mpHeaders(),
      body: JSON.stringify({
        p_name: G.playerName,
        p_secret: G.playerSecret,
        p_vocation: G.vocation,
        p_level: G.level,
        p_xp: G.xp + (XP_TABLE.slice(0, G.level - 1).reduce((a, b) => a + b, 0)),
        p_kills: G.totalKills,
        p_arena: G.arenaPoints,
        p_tasks: tasksDone,
        p_world: G.currentWorld,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if ((err.message || '').includes('em uso')) notify('Esse nome já pertence a outro jogador.', 'error');
      return false;
    }
    return true;
  } catch (e) {
    return false; // offline — sem drama, tenta de novo depois
  }
}

// ---- Leitura do ranking ----

async function fetchHighscores() {
  const now = Date.now();
  if (MP.cache && now - MP.cacheAt < 30000) return MP.cache;
  try {
    const res = await fetch(
      `${MP.url}/rest/v1/rubinot_idle_scores?select=name,vocation,level,xp,total_kills,arena_points,tasks_done,world,updated_at&order=level.desc,xp.desc&limit=50`,
      { headers: mpHeaders() }
    );
    if (!res.ok) return null;
    MP.cache = await res.json();
    MP.cacheAt = now;
    return MP.cache;
  } catch (e) { return null; }
}

async function fetchArenaOpponent() {
  try {
    const lo = Math.max(1, G.level - 15), hi = G.level + 15;
    const res = await fetch(
      `${MP.url}/rest/v1/rubinot_idle_scores?select=name,vocation,level,arena_points&level=gte.${lo}&level=lte.${hi}&name=neq.${encodeURIComponent(G.playerName || '~')}&limit=20`,
      { headers: mpHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    return rows[Math.floor(Math.random() * rows.length)];
  } catch (e) { return null; }
}

// ---- Painel de Highscores ----

const VOC_LABEL = { knight: '🛡️ Knight', paladin: '🏹 Paladin', sorcerer: '🔮 Sorcerer', druid: '🌿 Druid' };

async function renderHighscoresPanel() {
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
        <button class="btn-blue" onclick="submitScore(true).then(ok => { if(ok){ notify('Score atualizado!', 'success'); MP.cacheAt = 0; renderHighscoresPanel(); } })">📤 Atualizar agora</button>
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// envio periódico junto do autosave
setInterval(() => { submitScore(); }, 90000);
