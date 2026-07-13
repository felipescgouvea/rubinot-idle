import { G } from '../application/gameStore.js?v=125';
import { SHOP_ITEMS, SHOPS, isBoostActive } from '../domain/shopCatalog.js?v=125';
import { ITEMS, potionReqLabel } from '../domain/items.js?v=125';
import { on, EVENTS } from '../shared/eventBus.js?v=125';
import { formatNum, itemIconImg, goldIconImg, rubiniIconImg, vitalIconImg } from './shared.js?v=125';
import { t } from '../i18n/i18n.js?v=125';

function shopPriceLabel(s) {
  if (s.currency === 'real') return `R$ ${s.priceBRL.toFixed(2).replace('.', ',')}`;
  return s.currency === 'rubini' ? `${s.price} ${rubiniIconImg('inline-icon')} RC` : `${formatNum(s.price)} ${goldIconImg('inline-icon')}`;
}

// Boosts (xp/gold) não são um item de inventário — não têm itemId pra usar
// itemIconImg — mas o conceito ainda tem um ícone real (vitals/moeda).
// Pacotes de Rubini Coins (Loja Premium) usam a mesma sprite da moeda.
// Loot Boost e Supply Completo ficam com o emoji: não há sprite real de
// Tibia pra "chance de loot" ou "recarga instantânea" como conceito.
function shopIconHtml(s) {
  if (s.itemId) return itemIconImg(s.itemId);
  if (s.type === 'currency') return rubiniIconImg();
  if (s.boost === 'xp') return vitalIconImg('xp');
  if (s.boost === 'gold') return goldIconImg();
  return s.icon;
}

// Quantidade digitada por item da loja (poções/runas), sobrevive a
// re-renders do painel — ver comentário em renderShopCard/buyArea.
const shopQty = new Map();

function clampQty(value) {
  return Math.max(1, Math.min(9999, Math.floor(Number(value) || 1)));
}

// Sincroniza os dois inputs (número + range) do mesmo item depois que o
// valor muda por uma via que não é o próprio input disparando (setinha,
// scroll) — sem isso um ficaria mostrando o valor velho.
function syncShopQtyInputs(id) {
  const n = shopQty.get(id) || 1;
  const num = document.getElementById(`shop-qty-num-${id}`);
  const range = document.getElementById(`shop-qty-range-${id}`);
  if (num) num.value = n;
  if (range) range.value = n;
}

export function getShopQty(id) {
  return shopQty.get(id) || 1;
}

// Digitação direta no campo numérico ou arraste na barra — ambos os inputs
// chamam isso e ficam sincronizados entre si.
export function onShopQtyInput(id, value) {
  shopQty.set(id, clampQty(value));
  syncShopQtyInputs(id);
}

// Botões ◀/▶ da barra de rolagem: ajustam de 1 em 1.
export function stepShopQty(id, delta) {
  shopQty.set(id, clampQty((shopQty.get(id) || 1) + delta));
  syncShopQtyInputs(id);
}

// Scroll do mouse sobre a barra também ajusta de 1 em 1 (horizontal do
// trackpad tem prioridade; cai pra vertical em mouse sem scroll horizontal).
export function scrollShopQty(e, id) {
  e.preventDefault();
  const delta = e.deltaX !== 0 ? e.deltaX : -e.deltaY;
  const step = Math.sign(delta);
  if (!step) return;
  stepShopQty(id, step);
}

function renderShopCard(s) {
  const isReal = s.currency === 'real';
  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  const canAfford = isReal || balance >= s.price;
  const owned = s.type === 'outfit' && G.outfitsOwned.includes(s.id);
  const wearing = owned && G.outfit === s.icon;
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const stats = item ? ['atk', 'def', 'magic', 'heal', 'mana', 'dmg'].filter(k => item[k]).map(k => `${k.toUpperCase()} +${item[k]}`).join(' · ') : '';
  const reqLabel = item ? potionReqLabel(item, t) : '';
  const statLine = reqLabel ? `${stats} · <span class="shop-req">🔒 ${reqLabel}</span>` : stats;
  const iconHtml = shopIconHtml(s);
  // Poções/runas podem ser compradas em quantidade: campo numérico + barra de
  // rolagem (◀ trilha arrastável ▶, igual ao seletor de quantidade do trade
  // do Tibia) ao lado do Comprar. Equipamento/boost/outfit compram 1. A
  // quantidade fica em `shopQty` (fora do innerHTML) porque buyShopItem()
  // reemite EVENTS.SHOP_PANEL, que recria este HTML do zero — sem isso o
  // valor voltaria pra 1 a cada clique em "Comprar".
  const isBulk = s.type === 'item' && item && (item.type === 'potion' || item.type === 'rune');
  const qtyVal = shopQty.get(s.id) || 1;
  const buyArea = isBulk
    ? `<div class="shop-buy-row">
        <div class="shop-qty-widget" onclick="event.stopPropagation()" onwheel="scrollShopQty(event, '${s.id}')">
          <input type="number" id="shop-qty-num-${s.id}" class="shop-qty-num" min="1" max="9999" value="${qtyVal}" title="${t('shop.quantity')}" oninput="onShopQtyInput('${s.id}', this.value)" />
          <button type="button" class="shop-qty-arrow" onclick="stepShopQty('${s.id}', -1)">◀</button>
          <input type="range" id="shop-qty-range-${s.id}" class="shop-qty-range" min="1" max="9999" value="${qtyVal}" oninput="onShopQtyInput('${s.id}', this.value)" />
          <button type="button" class="shop-qty-arrow" onclick="stepShopQty('${s.id}', 1)">▶</button>
        </div>
        <button class="skill-upgrade-btn shop-buy-btn" onclick="buyShopItem('${s.id}', getShopQty('${s.id}'))" ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? t('shop.buy') : t('shop.noBalance')}
        </button>
      </div>`
    : `<button class="skill-upgrade-btn" onclick="buyShopItem('${s.id}')" ${(!canAfford && !owned) ? 'disabled' : ''}>
        ${owned ? (wearing ? `✅ ${t('shop.wearingClickToRemove')}` : t('shop.wearOutfit')) : isReal ? t('shop.buy') : canAfford ? t('shop.buy') : t('shop.insufficientBalance')}
      </button>`;
  return `<div class="skill-card" style="${wearing ? 'border:2px solid var(--gold); background:#fdf4d7;' : ''}">
    <div class="skill-card-header">
      <span class="skill-card-name">${iconHtml} ${t(s.name)}</span>
      <span class="skill-card-level" style="font-size:11px">${shopPriceLabel(s)}</span>
    </div>
    <div class="skill-card-desc">${s.desc ? t(s.desc) : statLine || ''}</div>
    ${buyArea}
  </div>`;
}

// Qual loja está selecionada no menu lateral (estado só de UI). Cada loja é
// como um NPC diferente — o jogador clica na esquerda e vê os itens à direita,
// em vez de uma lista gigante única.
let activeShop = SHOPS[0].key;

export function setShopTab(key) {
  if (!SHOPS.some(s => s.key === key)) return;
  activeShop = key;
  renderShopPanel();
}

// Conteúdo (itens agrupados por sub-seção) de UMA loja — o painel principal à
// direita do menu lateral.
function renderShopContent(shop) {
  const shopItems = SHOP_ITEMS.filter(s => s.shop === shop.key);
  const subs = shop.sub.map(sub => {
    const items = shopItems.filter(s => sub.filter(s, ITEMS));
    if (!items.length) return '';
    return `
      ${sub.title ? `<h4 style="margin: 12px 0 8px !important">${t(sub.title)}</h4>` : ''}
      <div id="skills-grid" style="margin: 0 0 8px !important">
        ${items.map(renderShopCard).join('')}
      </div>`;
  }).join('');
  return `
    <h3 style="margin:0 0 2px !important">${t(shop.title)}</h3>
    <p class="muted" style="margin:0 0 6px !important;font-size:12px">${t(shop.subtitle)}</p>
    ${subs}`;
}

export function renderShopPanel() {
  const el = document.getElementById('shop-content');
  if (!el) return;

  const now = Date.now();
  const activeBoosts = ['xp', 'loot', 'gold'].filter(k => isBoostActive(G.boosts, k, now)).map(k => {
    const mins = Math.ceil((G.boosts[k] - now) / 60000);
    return `${k.toUpperCase()} (${t('shop.minutesLeft', { mins })})`;
  });
  const shop = SHOPS.find(s => s.key === activeShop) || SHOPS[0];

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 12px !important">
      <strong>${t('shop.yourBalance')}</strong> <span>${formatNum(G.gold)} ${goldIconImg('inline-icon')} gold</span> · <span>${formatNum(G.rubini)} ${rubiniIconImg('inline-icon')} Rubini Coins</span>
      ${activeBoosts.length ? `<br/><strong>${t('shop.activeBoosts')}</strong> <span>${activeBoosts.join(' · ')}</span>` : ''}
    </div>
    <div class="shop-layout">
      <div class="shop-sidebar">
        ${SHOPS.map(s => `<button class="shop-tab-btn ${s.key === shop.key ? 'active' : ''}" onclick="setShopTab('${s.key}')">${t(s.title)}</button>`).join('')}
      </div>
      <div class="shop-main">
        ${renderShopContent(shop)}
      </div>
    </div>`;
}

export function wireShopPanelEvents() {
  on(EVENTS.SHOP_PANEL, renderShopPanel);
}
