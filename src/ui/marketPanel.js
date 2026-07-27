// Janela do MERCADO recriada fiel ao Market do Tibia: cabeçalho com saldo +
// carteira, navegador de itens à ESQUERDA (busca + lista com sprite real) e, à
// DIREITA, o item selecionado com suas ofertas de VENDA (compro) e de COMPRA
// (vendo), mais o formulário pra criar oferta. "Minhas ofertas" embaixo.
//
// A LÓGICA de economia (carteira, listar, comprar, preencher ordem) continua em
// application/marketUseCases.js — aqui é só a janela (render). Os handlers são
// expostos no window por main.js (depositToMarket, listItemOnMarket, ...).
import { G } from '../application/gameStore.js?v=357';
import { ITEMS } from '../domain/items.js?v=368';
import { on, EVENTS } from '../shared/eventBus.js?v=355';
import { formatNum, escapeHtml, itemIconImg, goldIconImg } from './shared.js?v=360';
import { registerPlayerName } from '../application/highscoresUseCases.js?v=358';
import { fetchMyMarketWallet, fetchMarketListings, fetchMarketStats } from '../application/marketUseCases.js?v=357';
import { isMarketEnabled } from '../application/adminUseCases.js?v=358';
import { t } from '../i18n/i18n.js?v=373';

// Estado só da janela (não é save): item selecionado, dados carregados e busca.
let selectedId = null;
let cache = { wallet: null, listings: null, feePct: 5 };
let search = '';

function tradeableList() {
  // Catálogo negociável = itens com valor de venda (mesma regra do Tibia: só o
  // que tem preço de mercado). Ordena por nome pra busca previsível.
  return Object.entries(ITEMS).filter(([, it]) => it.sell).sort((a, b) => a[1].name.localeCompare(b[1].name));
}

function daysLeft(expiresAt) {
  if (!expiresAt) return '';
  const d = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return d > 0 ? `⏳ ${d}d` : '';
}

// Lista do navegador: itens com oferta ativa + itens que você possui, unidos e
// filtrados pela busca (se buscar, varre o catálogo negociável inteiro).
function browserItems() {
  const withOffers = new Set((cache.listings || []).map(l => l.itemId));
  const owned = Object.entries(G.inventory).filter(([id, q]) => q > 0 && ITEMS[id]).map(([id]) => id);
  let ids;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    ids = tradeableList().filter(([, it]) => it.name.toLowerCase().includes(q)).map(([id]) => id);
  } else {
    ids = [...new Set([...withOffers, ...owned])].filter(id => ITEMS[id]);
    ids.sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
  }
  return ids;
}

function browserRowHtml(id) {
  const it = ITEMS[id];
  const offers = (cache.listings || []).filter(l => l.itemId === id);
  const sells = offers.filter(l => l.kind !== 'buy');
  const best = sells.length ? Math.min(...sells.map(l => l.pricePerUnit)) : null;
  const owned = G.inventory[id] || 0;
  return `<button class="mk-browse-row ${id === selectedId ? 'sel' : ''}" onclick="selectMarketItem('${id}')" title="${escapeHtml(it.name)}">
    ${itemIconImg(id, 'mk-browse-img')}
    <span class="mk-browse-name">${escapeHtml(it.name)}</span>
    <span class="mk-browse-meta">${best != null ? formatNum(best) + '&nbsp;' + goldIconImg('inline-icon') : (owned ? `x${owned}` : '')}</span>
  </button>`;
}

function offerTable(rows, kind) {
  // kind 'sell' = ofertas de venda de outros (eu COMPRO); 'buy' = ordens de
  // compra de outros (eu VENDO preenchendo).
  if (!rows.length) return `<p class="muted mk-empty">${kind === 'sell' ? t('market.noOtherListings') : t('market.noBuyOffers')}</p>`;
  const head = kind === 'sell' ? t('market.thSeller') : t('market.thBuyer');
  return `<table class="hs-table mk-offer-table">
    <thead><tr><th>${t('market.thQty')}</th><th>${t('market.thPricePerUnit')}</th><th>${t('market.thTotal')}</th><th>${head}</th><th></th></tr></thead>
    <tbody>${rows.map(l => {
      if (kind === 'sell') {
        return `<tr>
          <td>${l.qty}</td><td>${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}</td>
          <td>${formatNum(l.pricePerUnit * l.qty)} ${goldIconImg('inline-icon')}</td>
          <td>${escapeHtml(l.sellerName)} <span class="muted mk-days">${daysLeft(l.expiresAt)}</span></td>
          <td><button class="btn-blue" onclick="buyMarketListing('${l.id}', ${l.qty})">${t('market.buyAll')}</button></td>
        </tr>`;
      }
      const have = G.inventory[l.itemId] || 0;
      const fillQty = Math.min(have, l.qty);
      return `<tr>
        <td>${l.qty}</td><td>${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}</td>
        <td>${formatNum(l.pricePerUnit * l.qty)} ${goldIconImg('inline-icon')}</td>
        <td>${escapeHtml(l.sellerName)} <span class="muted mk-days">${daysLeft(l.expiresAt)}</span></td>
        <td><button class="btn-blue" ${have > 0 ? '' : 'disabled'} onclick="fillBuyOffer('${l.id}', '${l.itemId}', ${fillQty})">${t('market.sellN', { n: fillQty })}</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function detailHtml() {
  if (!selectedId || !ITEMS[selectedId]) return `<div class="mk-detail-empty muted">${t('market.pickItem')}</div>`;
  const it = ITEMS[selectedId];
  const offers = (cache.listings || []).filter(l => l.itemId === selectedId && !l.mine);
  const sells = offers.filter(l => l.kind !== 'buy').sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  const buys = offers.filter(l => l.kind === 'buy').sort((a, b) => b.pricePerUnit - a.pricePerUnit);
  const owned = G.inventory[selectedId] || 0;
  return `
    <div class="mk-detail-head">
      <div class="mk-detail-icon">${itemIconImg(selectedId, 'mk-detail-img')}</div>
      <div>
        <div class="mk-detail-name">${escapeHtml(it.name)}</div>
        <div class="muted mk-detail-sub">${t('market.youOwn', { n: owned })} · <span id="mk-sell-stats">📊 …</span></div>
      </div>
    </div>

    <div class="mk-book">
      <div class="mk-book-col">
        <h5 class="mk-book-title mk-sell-title">${t('market.sellOffers')} <span class="muted">${t('market.youBuy')}</span></h5>
        ${offerTable(sells, 'sell')}
      </div>
      <div class="mk-book-col">
        <h5 class="mk-book-title mk-buy-title">${t('market.buyOffers')} <span class="muted">${t('market.youSell')}</span></h5>
        ${offerTable(buys, 'buy')}
      </div>
    </div>

    <div class="mk-create">
      <div class="mk-create-row">
        <span class="mk-create-label">📤 ${t('market.createSell')}</span>
        <input id="mk-sell-qty" type="number" min="1" value="1" placeholder="${t('market.qtyPlaceholder')}" />
        <input id="mk-sell-price" type="number" min="1" placeholder="${t('market.pricePerUnitPlaceholder')}" />
        <button class="skill-upgrade-btn mk-act" ${owned > 0 ? '' : 'disabled'} onclick="listItemOnMarket('${selectedId}', document.getElementById('mk-sell-qty').value, document.getElementById('mk-sell-price').value)">${t('market.list')}</button>
      </div>
      <div class="mk-create-row">
        <span class="mk-create-label">📥 ${t('market.createBuy')}</span>
        <input id="mk-buy-qty" type="number" min="1" value="1" placeholder="${t('market.qtyPlaceholder')}" />
        <input id="mk-buy-price" type="number" min="1" placeholder="${t('market.pricePerUnitPlaceholder')}" />
        <button class="skill-upgrade-btn mk-act mk-act-buy" onclick="postBuyOffer('${selectedId}', document.getElementById('mk-buy-qty').value, document.getElementById('mk-buy-price').value)">${t('market.createOrder')}</button>
      </div>
      <div class="muted mk-fee">🏛️ ${cache.feePct}% ${t('market.houseFee')} · ⏳ ${t('market.expires7d')}</div>
    </div>`;
}

function myOffersHtml() {
  const mine = (cache.listings || []).filter(l => l.mine);
  if (!mine.length) return `<p class="muted">${t('market.noActiveListings')}</p>`;
  return mine.map(l => {
    const item = ITEMS[l.itemId];
    const isBuy = l.kind === 'buy';
    const tag = isBuy ? `<span class="mk-tag-buy">📥 ${t('market.tagBuy')}</span>` : `<span class="mk-tag-sell">📤 ${t('market.tagSell')}</span>`;
    return `<div class="mk-mine-row">
      <span class="mk-mine-item">${tag} ${item ? itemIconImg(l.itemId, 'mk-mine-img') : '?'} ${escapeHtml(item?.name || l.itemId)} <b>x${l.qty}</b></span>
      <span class="mk-mine-price">${formatNum(l.pricePerUnit)} ${goldIconImg('inline-icon')}${t('market.perUnitSuffix')}</span>
      <button class="mk-cancel" onclick="cancelMyListing('${l.id}', '${l.itemId}', ${l.qty}, '${l.kind || 'sell'}')">${t('market.cancelListing')}</button>
    </div>`;
  }).join('');
}

function renderShell() {
  const el = document.getElementById('market-content');
  if (!el) return;
  const w = cache.wallet;
  el.innerHTML = `
    <div class="mk-window">
      <div class="mk-balance">
        <span class="mk-bal-item">${t('market.characterGold')} <b>${formatNum(G.gold)} ${goldIconImg('inline-icon')}</b></span>
        <span class="mk-bal-item">${t('market.walletLabel')} <b>${w === null ? t('market.walletOffline') : formatNum(w) + ' ' + goldIconImg('inline-icon')}</b></span>
        <span class="mk-bal-actions">
          <input id="mk-deposit-amount" type="number" min="1" placeholder="${t('market.amountPlaceholder')}" />
          <button class="btn-blue" onclick="depositToMarket(document.getElementById('mk-deposit-amount').value)">${t('market.deposit')}</button>
          <button class="btn-blue" onclick="withdrawFromMarket(document.getElementById('mk-deposit-amount').value)">${t('market.withdraw')}</button>
        </span>
      </div>
      <div class="mk-body">
        <div class="mk-browser">
          <input id="mk-search" type="text" class="mk-search" placeholder="🔎 ${t('market.searchItem')}" value="${escapeHtml(search)}" oninput="marketSearchInput(this.value)" />
          <div class="mk-browse-list" id="mk-browse-list">${browserItems().map(browserRowHtml).join('') || `<p class="muted mk-empty">${t('market.noItemsInInventory')}</p>`}</div>
        </div>
        <div class="mk-detail" id="mk-detail">${detailHtml()}</div>
      </div>
      <h4 class="mk-mine-title">📦 ${t('market.myListings')}</h4>
      <div class="mk-mine" id="mk-mine">${myOffersHtml()}</div>
    </div>`;
  if (selectedId) loadStats(selectedId);
  const s = document.getElementById('mk-search');
  if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}

async function loadStats(itemId) {
  const el = document.getElementById('mk-sell-stats');
  if (!el || !itemId) return;
  const st = await fetchMarketStats(itemId);
  if (!el.isConnected) return;
  el.innerHTML = (!st || !st.count) ? `📊 ${t('market.noSales')}`
    : `📊 ${t('market.statLast')} ${formatNum(st.last)} · ${t('market.statAvg')} ${formatNum(st.avg)} · ${t('market.statMin')} ${formatNum(st.min)} · ${t('market.statMax')} ${formatNum(st.max)} (${st.count})`;
}

export async function renderMarketPanel() {
  const el = document.getElementById('market-content');
  if (!el) return;
  if (!isMarketEnabled()) { el.innerHTML = `<p class="muted">🚧 ${t('market.disabled')}</p>`; return; }
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
  cache = { wallet, listings: market ? market.listings : null, feePct: (market && market.feePct != null) ? market.feePct : 5 };
  if (!cache.listings) { el.innerHTML = `<p class="muted">${t('market.loadError')}</p>`; return; }
  // Seleção default: 1º item com oferta, senão o 1º da lista.
  const items = browserItems();
  if (!selectedId || !items.includes(selectedId)) selectedId = items[0] || null;
  renderShell();
}

// Clique num item do navegador — re-renderiza só o painel de detalhe.
export function selectMarketItem(itemId) {
  selectedId = itemId;
  const d = document.getElementById('mk-detail');
  if (d) { d.innerHTML = detailHtml(); loadStats(itemId); }
  // marca o selecionado na lista sem re-renderizar tudo
  document.querySelectorAll('.mk-browse-row.sel').forEach(b => b.classList.remove('sel'));
  const row = document.querySelector(`.mk-browse-row[onclick*="'${itemId}'"]`);
  if (row) row.classList.add('sel');
}

// Busca ao digitar — re-renderiza só a lista do navegador (mantém o foco/caret).
export function marketSearchInput(v) {
  search = v;
  const list = document.getElementById('mk-browse-list');
  if (list) list.innerHTML = browserItems().map(browserRowHtml).join('') || `<p class="muted mk-empty">${t('market.noItemsInInventory')}</p>`;
}

// Mantida por compatibilidade com o form antigo (main.js ainda exporta) — hoje a
// estatística é carregada no detalhe do item selecionado.
export async function showMarketStats(itemId) { loadStats(itemId); }

export async function handleMarketRegisterClick(name) {
  const ok = await registerPlayerName(name);
  if (ok) renderMarketPanel();
}

export function wireMarketPanelEvents() {
  on(EVENTS.MARKET_PANEL, renderMarketPanel);
}
