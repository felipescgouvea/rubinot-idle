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

// ===== MARKET (comércio entre jogadores via Supabase) =====
// Mesmo modelo de confiança do ranking: "secret" gerado no navegador identifica o
// jogador; toda escrita passa por função SECURITY DEFINER, nunca por INSERT direto.
// O gold do Market fica numa carteira própria no servidor (depositada/sacada pelo
// jogador) — separada do gold local do personagem, que só existe no navegador dele.

async function marketRpc(fn, body) {
  const res = await fetch(`${MP.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: mpHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Falha na operação do Market.');
  }
  return res.json().catch(() => null);
}

async function fetchMyMarketWallet() {
  if (!G.playerSecret) return 0;
  try {
    const gold = await marketRpc('rubinot_market_my_wallet', { p_secret: G.playerSecret });
    return gold || 0;
  } catch (e) { return null; }
}

async function fetchMarketListings() {
  try {
    const res = await fetch(
      `${MP.url}/rest/v1/rubinot_market_listings?select=id,seller_name,seller_secret,item_id,qty,price_per_unit,created_at&status=eq.active&order=created_at.desc&limit=100`,
      { headers: mpHeaders() }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}

async function depositToMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { notify('Valor inválido.', 'error'); return; }
  if (amount > G.gold) { notify('Você não tem esse tanto de gold no personagem.', 'error'); return; }
  ensurePlayerSecret();
  try {
    await marketRpc('rubinot_market_deposit', { p_secret: G.playerSecret, p_name: G.playerName, p_amount: amount });
    G.gold -= amount;
    notify(`+${amount} 💰 depositado na carteira do Market.`, 'success');
    renderHeaderStats();
    saveGame();
    renderMarketPanel();
  } catch (e) { notify(e.message, 'error'); }
}

async function withdrawFromMarket(amount) {
  amount = Math.floor(Number(amount));
  if (!amount || amount <= 0) { notify('Valor inválido.', 'error'); return; }
  try {
    await marketRpc('rubinot_market_withdraw', { p_secret: G.playerSecret, p_amount: amount });
    G.gold += amount;
    notify(`+${amount} 💰 sacado para o personagem.`, 'success');
    renderHeaderStats();
    saveGame();
    renderMarketPanel();
  } catch (e) { notify(e.message, 'error'); }
}

async function listItemOnMarket(itemId, qty, price) {
  qty = Math.floor(Number(qty));
  price = Math.floor(Number(price));
  const owned = G.inventory[itemId] || 0;
  if (!itemId || !ITEMS[itemId]) { notify('Selecione um item.', 'error'); return; }
  if (!qty || qty <= 0 || qty > owned) { notify('Quantidade inválida.', 'error'); return; }
  if (!price || price <= 0) { notify('Preço inválido.', 'error'); return; }
  ensurePlayerSecret();
  try {
    await marketRpc('rubinot_market_list_item', { p_secret: G.playerSecret, p_name: G.playerName, p_item_id: itemId, p_qty: qty, p_price: price });
    G.inventory[itemId] -= qty;
    if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
    notify(`Anúncio criado: ${qty}x ${ITEMS[itemId].name}.`, 'success');
    renderInventory();
    saveGame();
    renderMarketPanel();
  } catch (e) { notify(e.message, 'error'); }
}

async function cancelMyListing(listingId, itemId, qty) {
  try {
    await marketRpc('rubinot_market_cancel_listing', { p_secret: G.playerSecret, p_listing_id: listingId });
    G.inventory[itemId] = (G.inventory[itemId] || 0) + qty;
    notify('Anúncio cancelado — item devolvido ao inventário.', 'info');
    renderInventory();
    saveGame();
    renderMarketPanel();
  } catch (e) { notify(e.message, 'error'); }
}

async function buyMarketListing(listingId, qtyToBuy) {
  qtyToBuy = Math.floor(Number(qtyToBuy));
  if (!qtyToBuy || qtyToBuy <= 0) { notify('Quantidade inválida.', 'error'); return; }
  ensurePlayerSecret();
  try {
    const result = await marketRpc('rubinot_market_buy', { p_secret: G.playerSecret, p_name: G.playerName, p_listing_id: listingId, p_qty: qtyToBuy });
    G.inventory[result.item_id] = (G.inventory[result.item_id] || 0) + result.qty;
    notify(`Comprado: ${result.qty}x ${ITEMS[result.item_id]?.name || result.item_id}.`, 'success');
    renderInventory();
    saveGame();
    renderMarketPanel();
  } catch (e) { notify(e.message, 'error'); }
}

async function renderMarketPanel() {
  const el = document.getElementById('market-content');
  if (!el) return;

  if (!G.playerName) {
    el.innerHTML = `
      <div class="hs-register">
        <p class="muted">Registre um nome de personagem (o mesmo do Highscores) para comprar e vender no Mercado.</p>
        <div style="display:flex; gap:8px; max-width:380px">
          <input id="mk-name-input" type="text" maxlength="20" placeholder="Nome do personagem"
                 style="flex:1" onkeydown="if(event.key==='Enter')registerPlayerName(this.value).then(ok => ok && renderMarketPanel())" />
          <button class="btn-blue" onclick="registerPlayerName(document.getElementById('mk-name-input').value).then(ok => ok && renderMarketPanel())">Registrar</button>
        </div>
      </div>`;
    return;
  }

  ensurePlayerSecret();
  el.innerHTML = '<p class="muted">Carregando mercado…</p>';

  const [wallet, listings] = await Promise.all([fetchMyMarketWallet(), fetchMarketListings()]);
  const ownedItems = Object.entries(G.inventory).filter(([id, qty]) => qty > 0 && ITEMS[id]);

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 14px !important">
      <strong>Carteira do Market:</strong> <span>${wallet === null ? '— (offline)' : formatNum(wallet) + ' 💰'}</span> ·
      <strong>Gold do personagem:</strong> <span>${formatNum(G.gold)} 💰</span>
      <br/><span class="muted" style="font-size:11px">Deposite gold do personagem na carteira do Market para poder comprar; ao vender, o gold cai na carteira — saque quando quiser.</span>
      <div style="display:flex; gap:8px; margin-top:8px; max-width:420px">
        <input id="mk-deposit-amount" type="number" min="1" placeholder="Quantidade" style="flex:1" />
        <button class="btn-blue" onclick="depositToMarket(document.getElementById('mk-deposit-amount').value)">Depositar</button>
        <button class="btn-blue" onclick="withdrawFromMarket(document.getElementById('mk-deposit-amount').value)">Sacar</button>
      </div>
    </div>

    <h4 style="margin:12px 14px 8px">📤 Anunciar um item</h4>
    <div style="display:flex; gap:8px; margin:0 14px 14px; flex-wrap:wrap; align-items:center">
      <select id="mk-sell-item" style="flex:2; min-width:160px">
        ${ownedItems.length ? ownedItems.map(([id, qty]) => `<option value="${id}">${ITEMS[id].icon} ${ITEMS[id].name} (tem ${qty})</option>`).join('') : '<option value="">Sem itens no inventário</option>'}
      </select>
      <input id="mk-sell-qty" type="number" min="1" value="1" placeholder="Qtd" style="width:70px" />
      <input id="mk-sell-price" type="number" min="1" placeholder="Preço/un (gold)" style="width:130px" />
      <button class="skill-upgrade-btn" style="width:auto;padding:8px 16px" onclick="listItemOnMarket(document.getElementById('mk-sell-item').value, document.getElementById('mk-sell-qty').value, document.getElementById('mk-sell-price').value)">Anunciar</button>
    </div>

    <h4 style="margin:12px 14px 8px">📦 Meus anúncios</h4>
    <div id="mk-my-listings" style="margin:0 14px 14px"></div>

    <h4 style="margin:12px 14px 8px">🛒 Anúncios de outros jogadores</h4>
    <div id="mk-listings" style="margin:0 14px 14px"></div>
  `;

  if (!listings) {
    document.getElementById('mk-my-listings').innerHTML = '<p class="muted">Não foi possível carregar o mercado. Verifique sua conexão.</p>';
    document.getElementById('mk-listings').innerHTML = '';
    return;
  }

  const mine = listings.filter(l => l.seller_secret === G.playerSecret);
  const others = listings.filter(l => l.seller_secret !== G.playerSecret);

  document.getElementById('mk-my-listings').innerHTML = mine.length ? mine.map(l => {
    const item = ITEMS[l.item_id];
    return `<div class="skill-card" style="margin-bottom:8px">
      <div class="skill-card-header">
        <span class="skill-card-name">${item?.icon || '?'} ${item?.name || l.item_id} x${l.qty}</span>
        <span class="skill-card-level" style="font-size:11px">${formatNum(l.price_per_unit)} 💰/un</span>
      </div>
      <button class="skill-upgrade-btn" style="background:linear-gradient(180deg,#c0392b,#7b241c);border-color:#7b241c" onclick="cancelMyListing('${l.id}', '${l.item_id}', ${l.qty})">Cancelar anúncio</button>
    </div>`;
  }).join('') : '<p class="muted">Você não tem anúncios ativos.</p>';

  document.getElementById('mk-listings').innerHTML = others.length ? `
    <table class="hs-table">
      <thead><tr><th>Item</th><th>Qtd</th><th>Preço/un</th><th>Total</th><th>Vendedor</th><th></th></tr></thead>
      <tbody>
        ${others.map(l => {
          const item = ITEMS[l.item_id];
          return `<tr>
            <td>${item?.icon || '?'} ${item?.name || l.item_id}</td>
            <td>${l.qty}</td>
            <td>${formatNum(l.price_per_unit)} 💰</td>
            <td>${formatNum(l.price_per_unit * l.qty)} 💰</td>
            <td>${escapeHtml(l.seller_name)}</td>
            <td><button class="btn-blue" onclick="buyMarketListing('${l.id}', ${l.qty})">Comprar tudo</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '<p class="muted">Nenhum anúncio de outros jogadores no momento.</p>';
}

// envio periódico junto do autosave
setInterval(() => { submitScore(); }, 90000);
