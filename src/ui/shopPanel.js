import { G } from '../application/gameStore.js?v=21';
import { SHOP_ITEMS, SHOPS, isBoostActive } from '../domain/shopCatalog.js?v=21';
import { ITEMS } from '../domain/items.js?v=21';
import { on, EVENTS } from '../shared/eventBus.js?v=21';
import { formatNum, itemIconImg } from './shared.js?v=21';

function shopPriceLabel(s) {
  return s.currency === 'rubini' ? `${s.price} 💎 RC` : `${formatNum(s.price)} 💰`;
}

function renderShopCard(s) {
  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  const canAfford = balance >= s.price;
  const owned = s.type === 'outfit' && G.outfitsOwned.includes(s.id);
  const wearing = owned && G.outfit === s.icon;
  const item = s.itemId ? ITEMS[s.itemId] : null;
  const statLine = item ? ['atk', 'def', 'magic', 'heal', 'mana', 'dmg'].filter(k => item[k]).map(k => `${k.toUpperCase()} +${item[k]}`).join(' · ') : '';
  const iconHtml = s.itemId ? itemIconImg(s.itemId) : s.icon;
  return `<div class="skill-card" style="${wearing ? 'border:2px solid var(--gold); background:#fdf4d7;' : ''}">
    <div class="skill-card-header">
      <span class="skill-card-name">${iconHtml} ${s.name}</span>
      <span class="skill-card-level" style="font-size:11px">${shopPriceLabel(s)}</span>
    </div>
    <div class="skill-card-desc">${s.desc || statLine || ''}</div>
    <button class="skill-upgrade-btn" onclick="buyShopItem('${s.id}')"
      ${(!canAfford && !owned) ? 'disabled' : ''}>
      ${owned ? (wearing ? '✅ Em uso — clique p/ tirar' : 'Vestir outfit') : canAfford ? 'Comprar' : 'Saldo insuficiente'}
    </button>
  </div>`;
}

export function renderShopPanel() {
  const el = document.getElementById('shop-content');
  if (!el) return;

  const now = Date.now();
  const activeBoosts = ['xp', 'loot', 'gold'].filter(k => isBoostActive(G.boosts, k, now)).map(k => {
    const mins = Math.ceil((G.boosts[k] - now) / 60000);
    return `${k.toUpperCase()} (${mins}min restantes)`;
  });

  el.innerHTML = `
    <div id="skill-points-display" style="margin: 0 0 14px !important">
      <strong>Seu saldo:</strong> <span>${formatNum(G.gold)} 💰 gold</span> · <span>${formatNum(G.rubini)} 💎 Rubini Coins</span>
      ${activeBoosts.length ? `<br/><strong>Boosts ativos:</strong> <span>${activeBoosts.join(' · ')}</span>` : ''}
      <br/><span class="muted" style="font-size:11px">Ganhe Rubini Coins completando tasks e vencendo na Arena.</span>
    </div>
    ${SHOPS.map(shop => {
      const shopItems = SHOP_ITEMS.filter(s => s.shop === shop.key);
      return `
      <div class="shop-npc-block">
        <h3 style="margin:0 0 2px !important">${shop.title}</h3>
        <p class="muted" style="margin:0 0 10px !important;font-size:12px">${shop.subtitle}</p>
        ${shop.sub.map(sub => {
          const items = shopItems.filter(s => sub.filter(s, ITEMS));
          if (!items.length) return '';
          return `
          ${sub.title ? `<h4 style="margin: 10px 0 8px !important">${sub.title}</h4>` : ''}
          <div id="skills-grid" style="margin: 0 0 8px !important">
            ${items.map(renderShopCard).join('')}
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}`;
}

export function wireShopPanelEvents() {
  on(EVENTS.SHOP_PANEL, renderShopPanel);
}
