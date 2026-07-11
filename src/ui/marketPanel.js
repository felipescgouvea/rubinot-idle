import { G } from '../application/gameStore.js?v=56';
import { ITEMS } from '../domain/items.js?v=56';
import { on, EVENTS } from '../shared/eventBus.js?v=56';
import { formatNum, escapeHtml, itemIconImg, goldIconImg } from './shared.js?v=56';
import { ensurePlayerSecret, registerPlayerName } from '../application/highscoresUseCases.js?v=56';
import { fetchMyMarketWallet, fetchMarketListings } from '../application/marketUseCases.js?v=56';

export async function renderMarketPanel() {
  const el = document.getElementById('market-content');
  if (!el) return;

  if (!G.playerName) {
    el.innerHTML = `
      <div class="hs-register">
        <p class="muted">Este mercado é só para <strong>itens</strong> — o personagem em si nunca é negociado. Registre o nome do seu personagem (o mesmo do Highscores) apenas para identificar seus anúncios de item pros outros jogadores.</p>
        <div style="display:flex; gap:8px; max-width:380px">
          <input id="mk-name-input" type="text" maxlength="20" placeholder="Nome do personagem"
                 style="flex:1" onkeydown="if(event.key==='Enter')handleMarketRegisterClick(this.value)" />
          <button class="btn-blue" onclick="handleMarketRegisterClick(document.getElementById('mk-name-input').value)">Registrar</button>
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
      <strong>Carteira do Market:</strong> <span>${wallet === null ? '— (offline)' : formatNum(wallet) + ' ' + goldIconImg('inline-icon')}</span> ·
      <strong>Gold do personagem:</strong> <span>${formatNum(G.gold)} ${goldIconImg('inline-icon')}</span>
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
        <span class="skill-card-name">${item ? itemIconImg(l.item_id) : '?'} ${item?.name || l.item_id} x${l.qty}</span>
        <span class="skill-card-level" style="font-size:11px">${formatNum(l.price_per_unit)} ${goldIconImg('inline-icon')}/un</span>
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
            <td>${item ? itemIconImg(l.item_id) : '?'} ${item?.name || l.item_id}</td>
            <td>${l.qty}</td>
            <td>${formatNum(l.price_per_unit)} ${goldIconImg('inline-icon')}</td>
            <td>${formatNum(l.price_per_unit * l.qty)} ${goldIconImg('inline-icon')}</td>
            <td>${escapeHtml(l.seller_name)}</td>
            <td><button class="btn-blue" onclick="buyMarketListing('${l.id}', ${l.qty})">Comprar tudo</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '<p class="muted">Nenhum anúncio de outros jogadores no momento.</p>';
}

export async function handleMarketRegisterClick(name) {
  const ok = await registerPlayerName(name);
  if (ok) renderMarketPanel();
}

export function wireMarketPanelEvents() {
  on(EVENTS.MARKET_PANEL, renderMarketPanel);
}
