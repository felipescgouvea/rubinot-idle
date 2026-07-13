import { G } from '../application/gameStore.js?v=125';
import { ITEMS } from '../domain/items.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { formatNum, escapeHtml, itemIconImg, goldIconImg } from './shared.js?v=125';
import { ensurePlayerSecret, registerPlayerName } from '../application/highscoresUseCases.js?v=125';
import { fetchMyMarketWallet, fetchMarketListings } from '../application/marketUseCases.js?v=125';
import { isMarketEnabled } from '../application/adminUseCases.js?v=127';
import { t } from '../i18n/i18n.js?v=125';

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

  ensurePlayerSecret();
  el.innerHTML = `<p class="muted">${t('market.loading')}</p>`;

  const [wallet, listings] = await Promise.all([fetchMyMarketWallet(), fetchMarketListings()]);
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
      <select id="mk-sell-item" style="flex:2; min-width:160px">
        ${ownedItems.length ? ownedItems.map(([id, qty]) => `<option value="${id}">${ITEMS[id].icon} ${ITEMS[id].name} ${t('market.haveQty', { qty })}</option>`).join('') : `<option value="">${t('market.noItemsInInventory')}</option>`}
      </select>
      <input id="mk-sell-qty" type="number" min="1" value="1" placeholder="${t('market.qtyPlaceholder')}" style="width:70px" />
      <input id="mk-sell-price" type="number" min="1" placeholder="${t('market.pricePerUnitPlaceholder')}" style="width:130px" />
      <button class="skill-upgrade-btn" style="width:auto;padding:8px 16px" onclick="listItemOnMarket(document.getElementById('mk-sell-item').value, document.getElementById('mk-sell-qty').value, document.getElementById('mk-sell-price').value)">${t('market.list')}</button>
    </div>

    <h4 style="margin:12px 14px 8px">📦 ${t('market.myListings')}</h4>
    <div id="mk-my-listings" style="margin:0 14px 14px"></div>

    <h4 style="margin:12px 14px 8px">🛒 ${t('market.othersListings')}</h4>
    <div id="mk-listings" style="margin:0 14px 14px"></div>
  `;

  if (!listings) {
    document.getElementById('mk-my-listings').innerHTML = `<p class="muted">${t('market.loadError')}</p>`;
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
        <span class="skill-card-level" style="font-size:11px">${formatNum(l.price_per_unit)} ${goldIconImg('inline-icon')}${t('market.perUnitSuffix')}</span>
      </div>
      <button class="skill-upgrade-btn" style="background:linear-gradient(180deg,#c0392b,#7b241c);border-color:#7b241c" onclick="cancelMyListing('${l.id}', '${l.item_id}', ${l.qty})">${t('market.cancelListing')}</button>
    </div>`;
  }).join('') : `<p class="muted">${t('market.noActiveListings')}</p>`;

  document.getElementById('mk-listings').innerHTML = others.length ? `
    <table class="hs-table">
      <thead><tr><th>${t('market.thItem')}</th><th>${t('market.thQty')}</th><th>${t('market.thPricePerUnit')}</th><th>${t('market.thTotal')}</th><th>${t('market.thSeller')}</th><th></th></tr></thead>
      <tbody>
        ${others.map(l => {
          const item = ITEMS[l.item_id];
          return `<tr>
            <td>${item ? itemIconImg(l.item_id) : '?'} ${item?.name || l.item_id}</td>
            <td>${l.qty}</td>
            <td>${formatNum(l.price_per_unit)} ${goldIconImg('inline-icon')}</td>
            <td>${formatNum(l.price_per_unit * l.qty)} ${goldIconImg('inline-icon')}</td>
            <td>${escapeHtml(l.seller_name)}</td>
            <td><button class="btn-blue" onclick="buyMarketListing('${l.id}', ${l.qty})">${t('market.buyAll')}</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : `<p class="muted">${t('market.noOtherListings')}</p>`;
}

export async function handleMarketRegisterClick(name) {
  const ok = await registerPlayerName(name);
  if (ok) renderMarketPanel();
}

export function wireMarketPanelEvents() {
  on(EVENTS.MARKET_PANEL, renderMarketPanel);
}
