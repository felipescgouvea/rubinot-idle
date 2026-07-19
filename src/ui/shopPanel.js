import { G } from '../application/gameStore.js?v=129';
import { SHOP_ITEMS, SHOPS, isBoostActive } from '../domain/shopCatalog.js?v=128';
import { ITEMS, potionReqLabel } from '../domain/items.js?v=140';
import { on, EVENTS } from '../shared/eventBus.js?v=127';
import { formatNum, itemIconImg, goldIconImg, rubiniIconImg, vitalIconImg, openModal, closeModal } from './shared.js?v=132';
import { buyShopItem } from '../application/shopUseCases.js?v=133';
import { t } from '../i18n/i18n.js?v=143';

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
  if (s.itemId) return itemIconImg(s.itemId, 'shop-item-icon');
  if (s.type === 'currency') return rubiniIconImg();
  if (s.boost === 'xp') return vitalIconImg('xp');
  if (s.boost === 'gold') return goldIconImg();
  return s.icon;
}

// Quantidade digitada por item da loja (poções/runas), sobrevive a
// re-renders do painel — ver comentário em renderShopCard/buyArea.
const shopQty = new Map();

// Teto real da barra: nunca faz sentido deixar o jogador arrastar pra uma
// quantidade que ele não tem gold pra comprar (senão o Comprar desabilita
// no meio do slider sem explicação nenhuma).
function getMaxAffordableQty(id) {
  const s = SHOP_ITEMS.find(item => item.id === id);
  if (!s || s.currency === 'real' || !s.price) return 9999;
  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  return Math.max(1, Math.min(9999, Math.floor(balance / s.price)));
}

function clampQty(value, max) {
  return Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));
}

// Sincroniza os dois inputs (número + range) do mesmo item depois que o
// valor muda por uma via que não é o próprio input disparando (setinha,
// scroll) — sem isso um ficaria mostrando o valor velho.
function syncShopQtyInputs(id) {
  const n = shopQty.get(id) || 1;
  const max = getMaxAffordableQty(id);
  const num = document.getElementById(`shop-qty-num-${id}`);
  const range = document.getElementById(`shop-qty-range-${id}`);
  if (num) { num.max = max; num.value = n; }
  if (range) { range.max = max; range.value = n; }
}

export function getShopQty(id) {
  return shopQty.get(id) || 1;
}

// Digitação direta no campo numérico ou arraste na barra — ambos os inputs
// chamam isso e ficam sincronizados entre si.
export function onShopQtyInput(id, value) {
  shopQty.set(id, clampQty(value, getMaxAffordableQty(id)));
  syncShopQtyInputs(id);
}

// Botões ◀/▶ da barra de rolagem: ajustam de 1 em 1.
export function stepShopQty(id, delta) {
  shopQty.set(id, clampQty((shopQty.get(id) || 1) + delta, getMaxAffordableQty(id)));
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

// Confirmação antes de gastar gold/RC de verdade — sem isso um clique errado
// (ou scroll acidental mudando a quantidade) já debita o saldo na hora.
export function confirmBuyShopItem(id, qty = 1) {
  const s = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;
  const owned = s.type === 'outfit' && G.outfitsOwned.includes(s.id);
  // Trocar/tirar um outfit já comprado é reversível e não custa nada de novo —
  // não faz sentido confirmar isso.
  if (owned || s.currency === 'real') { buyShopItem(id, qty); return; }
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const count = item && (item.type === 'potion' || item.type === 'rune') ? Math.max(1, Math.floor(Number(qty) || 1)) : 1;
  const total = s.price * count;
  const totalLabel = s.currency === 'rubini' ? `${total} ${rubiniIconImg('inline-icon')} RC` : `${formatNum(total)} ${goldIconImg('inline-icon')}`;
  openModal(`
    <h3>${shopIconHtml(s)} ${t(s.name)}</h3>
    <p>${t('shop.confirmBuyMsg', { count, name: t(s.name), price: totalLabel })}</p>
    <button onclick="buyShopItem('${id}', ${count}); closeModal();" style="margin-top:8px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">${t('shop.confirmBuyYes')}</button>
    <button onclick="closeModal()" style="margin-top:6px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('shop.confirmBuyNo')}</button>
  `);
}

function renderShopCard(s) {
  const isReal = s.currency === 'real';
  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  const canAfford = isReal || balance >= s.price;
  const owned = s.type === 'outfit' && G.outfitsOwned.includes(s.id);
  const wearing = owned && G.outfit === s.icon;
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const statKeys = item && item.type === 'potion' ? ['atk', 'def', 'magic'] : ['atk', 'def', 'magic', 'heal', 'mana', 'dmg'];
  const stats = item ? statKeys.filter(k => item[k]).map(k => `${k.toUpperCase()} +${item[k]}`).join(' · ') : '';
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
  const qtyMax = isBulk ? getMaxAffordableQty(s.id) : 9999;
  const qtyVal = isBulk ? clampQty(shopQty.get(s.id) || 1, qtyMax) : (shopQty.get(s.id) || 1);
  if (isBulk) shopQty.set(s.id, qtyVal);
  const buyArea = isBulk
    ? `<div class="shop-buy-row">
        <div class="shop-qty-widget" onclick="event.stopPropagation()" onwheel="scrollShopQty(event, '${s.id}')">
          <input type="number" id="shop-qty-num-${s.id}" class="shop-qty-num" min="1" max="${qtyMax}" value="${qtyVal}" title="${t('shop.quantity')}" oninput="onShopQtyInput('${s.id}', this.value)" />
          <button type="button" class="shop-qty-arrow" onclick="stepShopQty('${s.id}', -1)">◀</button>
          <input type="range" id="shop-qty-range-${s.id}" class="shop-qty-range" min="1" max="${qtyMax}" value="${qtyVal}" oninput="onShopQtyInput('${s.id}', this.value)" />
          <button type="button" class="shop-qty-arrow" onclick="stepShopQty('${s.id}', 1)">▶</button>
        </div>
        <button class="skill-upgrade-btn shop-buy-btn" onclick="confirmBuyShopItem('${s.id}', getShopQty('${s.id}'))" ${!canAfford ? 'disabled' : ''}>
          ${canAfford ? t('shop.buy') : t('shop.noBalance')}
        </button>
      </div>`
    : `<button class="skill-upgrade-btn" onclick="confirmBuyShopItem('${s.id}')" ${(!canAfford && !owned) ? 'disabled' : ''}>
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

// Grupo ativo dentro da loja atual (só lojas com `groups` usam isso — hoje só
// a Loja de Equipamentos, que virou grande demais pra ficar tudo numa lista
// só: Armas/Armaduras, Arcos/Crossbows/Munição, Wands/Rods).
const activeShopGroup = new Map();

export function setShopGroup(shopKey, groupKey) {
  activeShopGroup.set(shopKey, groupKey);
  renderShopPanel();
}

// Conteúdo (itens agrupados por sub-seção) de UMA loja — o painel principal à
// direita do menu lateral.
function renderShopContent(shop) {
  const shopItems = SHOP_ITEMS.filter(s => s.shop === shop.key);
  const groupTabs = shop.groups ? `<div class="admin-subtabs">
      ${shop.groups.map(g => `<button class="admin-subtab-btn ${g.key === (activeShopGroup.get(shop.key) || shop.groups[0].key) ? 'active' : ''}" onclick="setShopGroup('${shop.key}', '${g.key}')">${t(g.title)}</button>`).join('')}
    </div>` : '';
  const activeGroup = shop.groups ? (activeShopGroup.get(shop.key) || shop.groups[0].key) : null;
  const subs = shop.sub.filter(sub => !activeGroup || sub.group === activeGroup).map(sub => {
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
    ${groupTabs}
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
