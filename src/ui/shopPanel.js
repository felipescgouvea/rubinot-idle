import { G } from '../application/gameStore.js?v=117';
import { SHOP_ITEMS, SHOPS, isBoostActive } from '../domain/shopCatalog.js?v=117';
import { ITEMS, potionReqLabel } from '../domain/items.js?v=117';
import { on, EVENTS } from '../shared/eventBus.js?v=117';
import { formatNum, itemIconImg, goldIconImg, rubiniIconImg, vitalIconImg } from './shared.js?v=117';

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

export function updateShopQty(id, value) {
  shopQty.set(id, Math.max(1, Math.min(9999, Math.floor(Number(value) || 1))));
}

// Scroll horizontal sobre o campo ajusta a quantidade de 1 em 1, no lugar das
// setinhas nativas do input number (que exigem clique preciso e só mudam 1
// por clique). Cai pra deltaY quando o dispositivo não manda deltaX (mouse
// comum sem scroll horizontal).
export function scrollShopQty(e, id, input) {
  e.preventDefault();
  const delta = e.deltaX !== 0 ? e.deltaX : -e.deltaY;
  const step = Math.sign(delta);
  if (!step) return;
  const current = Math.max(1, Math.min(9999, Math.floor(Number(input.value) || 1)));
  const next = Math.max(1, Math.min(9999, current + step));
  input.value = next;
  shopQty.set(id, next);
}

function renderShopCard(s) {
  const isReal = s.currency === 'real';
  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  const canAfford = isReal || balance >= s.price;
  const owned = s.type === 'outfit' && G.outfitsOwned.includes(s.id);
  const wearing = owned && G.outfit === s.icon;
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const stats = item ? ['atk', 'def', 'magic', 'heal', 'mana', 'dmg'].filter(k => item[k]).map(k => `${k.toUpperCase()} +${item[k]}`).join(' · ') : '';
  const reqLabel = item ? potionReqLabel(item) : '';
  const statLine = reqLabel ? `${stats} · <span class="shop-req">🔒 ${reqLabel}</span>` : stats;
  const iconHtml = shopIconHtml(s);
  // Poções/runas podem ser compradas em quantidade: um seletor (input number,
  // ajustável via scroll horizontal) ao lado do Comprar. Equipamento/boost/outfit
  // compram 1. A quantidade digitada fica em `shopQty` (fora do innerHTML) porque
  // buyShopItem() reemite EVENTS.SHOP_PANEL, que recria este HTML do zero — sem
  // isso o valor voltaria pra 1 a cada clique em "Comprar".
  const isBulk = s.type === 'item' && item && (item.type === 'potion' || item.type === 'rune');
  const qtyVal = shopQty.get(s.id) || 1;
  const buyArea = isBulk
    ? `<div class="shop-buy-row">
        <input type="number" class="shop-qty" min="1" max="9999" value="${qtyVal}" title="Quantidade — role o scroll sobre o campo pra ajustar" onclick="event.stopPropagation()" oninput="updateShopQty('${s.id}', this.value)" onwheel="scrollShopQty(event, '${s.id}', this)" />
        <button class="skill-upgrade-btn" onclick="buyShopItem('${s.id}', this.previousElementSibling.value)" ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? 'Comprar' : 'Saldo insuficiente'}
        </button>
      </div>`
    : `<button class="skill-upgrade-btn" onclick="buyShopItem('${s.id}')" ${(!canAfford && !owned) ? 'disabled' : ''}>
        ${owned ? (wearing ? '✅ Em uso — clique p/ tirar' : 'Vestir outfit') : isReal ? 'Comprar' : canAfford ? 'Comprar' : 'Saldo insuficiente'}
      </button>`;
  return `<div class="skill-card" style="${wearing ? 'border:2px solid var(--gold); background:#fdf4d7;' : ''}">
    <div class="skill-card-header">
      <span class="skill-card-name">${iconHtml} ${s.name}</span>
      <span class="skill-card-level" style="font-size:11px">${shopPriceLabel(s)}</span>
    </div>
    <div class="skill-card-desc">${s.desc || statLine || ''}</div>
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
      ${sub.title ? `<h4 style="margin: 12px 0 8px !important">${sub.title}</h4>` : ''}
      <div id="skills-grid" style="margin: 0 0 8px !important">
        ${items.map(renderShopCard).join('')}
      </div>`;
  }).join('');
  return `
    <h3 style="margin:0 0 2px !important">${shop.title}</h3>
    <p class="muted" style="margin:0 0 6px !important;font-size:12px">${shop.subtitle}</p>
    ${subs}`;
}

export function renderShopPanel() {
  const el = document.getElementById('shop-content');
  if (!el) return;

  const now = Date.now();
  const activeBoosts = ['xp', 'loot', 'gold'].filter(k => isBoostActive(G.boosts, k, now)).map(k => {
    const mins = Math.ceil((G.boosts[k] - now) / 60000);
    return `${k.toUpperCase()} (${mins}min restantes)`;
  });
  const shop = SHOPS.find(s => s.key === activeShop) || SHOPS[0];

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 12px !important">
      <strong>Seu saldo:</strong> <span>${formatNum(G.gold)} ${goldIconImg('inline-icon')} gold</span> · <span>${formatNum(G.rubini)} ${rubiniIconImg('inline-icon')} Rubini Coins</span>
      ${activeBoosts.length ? `<br/><strong>Boosts ativos:</strong> <span>${activeBoosts.join(' · ')}</span>` : ''}
    </div>
    <div class="shop-layout">
      <div class="shop-sidebar">
        ${SHOPS.map(s => `<button class="shop-tab-btn ${s.key === shop.key ? 'active' : ''}" onclick="setShopTab('${s.key}')">${s.title}</button>`).join('')}
      </div>
      <div class="shop-main">
        ${renderShopContent(shop)}
      </div>
    </div>`;
}

export function wireShopPanelEvents() {
  on(EVENTS.SHOP_PANEL, renderShopPanel);
}
