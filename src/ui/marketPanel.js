import { G } from '../application/gameStore.js?v=241';
import { ITEMS } from '../domain/items.js?v=252';
import { on, EVENTS } from '../shared/eventBus.js?v=239';
import { formatNum, escapeHtml, itemIconImg, goldIconImg } from './shared.js?v=244';
import { registerPlayerName } from '../application/highscoresUseCases.js?v=241';
import { fetchMyMarketWallet, fetchMarketListings, fetchMarketStats } from '../application/marketUseCases.js?v=241';
import { isMarketEnabled } from '../application/adminUseCases.js?v=242';
import { t } from '../i18n/i18n.js?v=255';

export async function renderMarketPanel() {
  const el = document.getElementById('market-content');
  if (!el) return;

  // Mercado entre jogadores pode estar desligado pelo dono (Painel Admin).
  if (!isMarketEnabled()) {
    el.innerHTML = `<p class="muted">🚧 ${t('market.disabled')}</p>`;
    return;
  }

  if (!G.playerName) {
    el.innerHTML = `
      <div class="hs-register">
        <p class="muted">${t('market.registerIntro')}</p>
        <div style="display:flex; gap:8px; max-width:380px">
          <input id="mk-name-input" type="text" maxlength="20" placeholder="${t('market.characterNamePlaceholder')}"
                 style="flex:1" onkeydown="if(event.key==='Enter')handleMarketRegisterClick(this.value)" />
          <button class="btn-blue" onclick="handleMarketRegisterClick(document.getElementById('mk-name-input').value)">${t('market.register')}</button>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `<p class="muted">${t('market.loading')}</p>`;

  const [wallet, market] = await Promise.all([fetchMyMarketWallet(), fetchMarketListings()]);
  const feePct = (market && market.feePct != null) ? market.feePct : 5;
  const listings = market ? market.listings : null;
  const ownedItems = Object.entries(G.inventory).filter(([id, qty]) => qty > 0 && ITEMS[id]);

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 14px !important">
      <strong>${t('market.walletLabel')}</strong> <span>${wallet === null ? t('market.walletOffline') : formatNum(wallet) + ' ' + goldIconImg('inline-icon')}</span> ·
      <strong>${t('market.characterGold')}</strong> <span>${formatNum(G.gold)} ${goldIconImg('inline-icon')}</span>
      <br/><span class="muted" style="font-size:11px">${t('market.walletHint')}</span>
      <div style="display:flex; gap:8px; margin-top:8px; max-width:420px">
        <input id="mk-deposit-amount" type="number" min="1" placeholder="${t('market.amountPlaceholder')}" style="flex:1" />
        <button class="btn-blue" onclick="depositToMarket(document.getElementById('mk-deposit-amount').value)">${t('market.deposit')}</button>
        <button class="btn-blue" onclick="withdrawFromMarket(document.getElementById('mk-deposit-amount').value)">${t('market.withdraw')}</button>
      </div>
    </div>

    <h4 style="margin:12px 14px 8px">📤 ${t('market.listItem')}</h4>
    <div style="display:flex; gap:8px; margin:0 14px 14px; flex-wrap:wrap; align-items:center">
      <select id="mk-sell-item" style="flex:2; min-width:160px" onchange="showMarketStats(this.value)">
        ${ownedItems.length ? ownedItems.map(([id, qty]) => `<option value="${id}">${ITEMS[id].icon} ${ITEMS[id].name} ${t('market.haveQty', { qty })}</option>`).join('') : `<option value="">${t('market.noItemsInInventory')}</option>`}
      </select>
      <input id="mk-sell-qty" type="number" min="1" value="1" placeholder="${t('market.qtyPlaceholder')}" style="width:70px" />
      <input id="mk-sell-price" type="number" min="1" placeholder="${t('market.pricePerUnitPlaceholder')}" style="width:130px" />
      <button class="skill-upgrade-btn" style="width:auto;padding:8px 16px" onclick="listItemOnMarket(document.getElementById('mk-sell-item').value, document.getElementById('mk-sell-qty').value, document.getElementById('mk-sell-price').value)">${t('market.list')}</button>
    </div>
    <div style="margin:-6px 14px 14px; font-size:11.5px; color:#8a92b8">🏛️ ${feePct}% taxa da casa na venda · ⏳ anúncio expira em 7 dias · <span id="mk-sell-stats"></span></div>

    <h4 style="margin:12px 14px 8px">📥 Ordem de compra <span class="muted" style="font-size:11px">(reserva o gold da carteira; qualquer vendedor pode preencher)</span></h4>
    <div style="display:flex; gap:8px; margin:0 14px 14px; flex-wrap:wrap; align-items:center">
      <select id="mk-buy-item" style="flex:2; min-width:160px">
        ${allItemOptions()}
      </select>
      <input id="mk-buy-qty" type="number" min="1" value="1" placeholder="qtd" style="width:70px" />
      <input id="mk-buy-price" type="number" min="1" placeholder="preço/un" style="width:130px" />
      <button class="skill-upgrade-btn" style="width:auto;padding:8px 16px;background:linear-gradient(180deg,#2e86c1,#1b4f72);border-color:#1b4f72" onclick="postBuyOffer(document.getElementById('mk-buy-item').value, document.getElementById('mk-buy-qty').value, document.getElementById('mk-buy-price').value)">Criar ordem</button>
    </div>

    <h4 style="margin:12px 14px 8px">📦 ${t('market.myListings')}</h4>
    <div id="mk-my-listings" style="margin:0 14px 14px"></div>

    <h4 style="margin:12px 14px 8px">🛒 ${t('market.othersListings')}</h4>
    <div id="mk-listings" style="margin:0 14px 14px"></div>

    <h4 style="margin:12px 14px 8px">📥 Ordens de compra abertas <span class="muted" style="font-size:11px">(venda seu item e receba na carteira)</span></h4>
    <div id="mk-buy-offers" style="margin:0 14px 14px"></div>
  `;

  if (!listings) {
    document.getElementById('mk-my-listings').innerHTML = `<p class="muted">${t('market.loadError')}</p>`;
    document.getElementById('mk-listings').innerHTML = '';
    return;
  }

  const isBuy = l => l.kind === 'buy';
  const mine = listings.filter(l => l.mine);
  const othersSell = listings.filter(l => !l.mine && !isBuy(l));
  const othersBuy = listings.filter(l => !l.mine && isBuy(l));

  // Meus anúncios (venda e compra) — cancelar devolve item (venda) ou gold (compra).
  document.getElementById('mk-my-listings').innerHTML = mine.length ? mine.map(l => {
    const item = ITEMS[l.itemId];
    const tag = isBuy(l) ? '<span style="color:#5dade2">📥 compra</span>' : '<span style="color:#58d68d">📤 venda</span>';
    return `<div class="skill-card" style="margin-bottom:8px">
      <div class="skill-card-header">
        <span class="skill-card-name">${tag} ${item ? itemIconImg(l.itemId) : '?'} ${item?.name || l.itemId} x${l.qty}</span>
        <span class="skill-card-level" style="font-size:11px">${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}${t('market.perUnitSuffix')}</span>
      </div>
      <button class="skill-upgrade-btn" style="background:linear-gradient(180deg,#c0392b,#7b241c);border-color:#7b241c" onclick="cancelMyListing('${l.id}', '${l.itemId}', ${l.qty}, '${l.kind || 'sell'}')">${t('market.cancelListing')}</button>
    </div>`;
  }).join('') : `<p class="muted">${t('market.noActiveListings')}</p>`;

  // Vendas de outros — eu compro.
  document.getElementById('mk-listings').innerHTML = othersSell.length ? `
    <table class="hs-table">
      <thead><tr><th>${t('market.thItem')}</th><th>${t('market.thQty')}</th><th>${t('market.thPricePerUnit')}</th><th>${t('market.thTotal')}</th><th>${t('market.thSeller')}</th><th></th></tr></thead>
      <tbody>
        ${othersSell.map(l => {
          const item = ITEMS[l.itemId];
          return `<tr>
            <td>${item ? itemIconImg(l.itemId) : '?'} ${item?.name || l.itemId}</td>
            <td>${l.qty}</td>
            <td>${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}</td>
            <td>${formatNum(l.pricePerUnit * l.qty)} ${goldIconImg('inline-icon')}</td>
            <td>${escapeHtml(l.sellerName)} <span class="muted" style="font-size:10px">${daysLeft(l.expiresAt)}</span></td>
            <td><button class="btn-blue" onclick="buyMarketListing('${l.id}', ${l.qty})">${t('market.buyAll')}</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<p class="muted">${t('market.noOtherListings')}</p>`;

  // Ordens de compra de outros — eu vendo (preencho) se tiver o item.
  const buyEl = document.getElementById('mk-buy-offers');
  if (buyEl) buyEl.innerHTML = othersBuy.length ? `
    <table class="hs-table">
      <thead><tr><th>${t('market.thItem')}</th><th>${t('market.thQty')}</th><th>${t('market.thPricePerUnit')}</th><th>${t('market.thTotal')}</th><th>${t('market.thSeller')}</th><th></th></tr></thead>
      <tbody>
        ${othersBuy.map(l => {
          const item = ITEMS[l.itemId];
          const have = G.inventory[l.itemId] || 0;
          const canFill = have > 0;
          const fillQty = Math.min(have, l.qty);
          return `<tr>
            <td>${item ? itemIconImg(l.itemId) : '?'} ${item?.name || l.itemId} <span class="muted" style="font-size:10px">(tem ${have})</span></td>
            <td>${l.qty}</td>
            <td>${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}</td>
            <td>${formatNum(l.pricePerUnit * l.qty)} ${goldIconImg('inline-icon')}</td>
            <td>${escapeHtml(l.sellerName)} <span class="muted" style="font-size:10px">${daysLeft(l.expiresAt)}</span></td>
            <td><button class="btn-blue" ${canFill ? '' : 'disabled'} onclick="fillBuyOffer('${l.id}', '${l.itemId}', ${fillQty})">Vender ${fillQty}</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<p class="muted">Nenhuma ordem de compra aberta.</p>`;
}

// Opções de TODOS os itens tradeáveis (com valor de venda) — pra escolher o que
// comprar numa buy offer (você quer itens que talvez não tenha). Ordenado por nome.
function allItemOptions() {
  return Object.entries(ITEMS)
    .filter(([, it]) => it.sell)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([id, it]) => `<option value="${id}">${it.icon} ${it.name}</option>`)
    .join('');
}

// Dias restantes até expirar (pra a coluna ⏳ da tabela de compra).
function daysLeft(expiresAt) {
  if (!expiresAt) return '';
  const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return d > 0 ? `⏳ ${d}d` : '';
}

// Busca e exibe a estatística de preço do item selecionado no form de venda
// (últimas vendas reais) — ajuda a precificar. Emoji+número, sem i18n.
export async function showMarketStats(itemId) {
  const el = document.getElementById('mk-sell-stats');
  if (!el || !itemId) return;
  el.textContent = '📊 …';
  const s = await fetchMarketStats(itemId);
  if (!s || !s.count) { el.textContent = '📊 sem vendas registradas'; return; }
  el.innerHTML = `📊 últ ${formatNum(s.last)} · méd ${formatNum(s.avg)} · min ${formatNum(s.min)} · máx ${formatNum(s.max)} (${s.count})`;
}

export async function handleMarketRegisterClick(name) {
  const ok = await registerPlayerName(name);
  if (ok) renderMarketPanel();
}

export function wireMarketPanelEvents() {
  on(EVENTS.MARKET_PANEL, renderMarketPanel);
}
