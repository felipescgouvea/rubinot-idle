// Inventário, modal de detalhe do item, Relíquias e os slots de equipamento
// no card da Caçada — ficam juntos porque compartilham o mesmo modelo de item
// (Relíquia é uma variação de item — ver domain/items.js: isRelicId).
import { G } from '../application/gameStore.js?v=33';
import { ITEMS, EQUIPMENT_SLOTS, EQUIPPABLE_TYPES, CONSUMABLE_TYPES, isRelicId, resolveEquippedItem } from '../domain/items.js?v=33';
import { RARITY_TIERS, primaryStatKeyForItem } from '../domain/rarity.js?v=33';
import { on, EVENTS } from '../shared/eventBus.js?v=33';
import { openModal, itemIconImg, goldIconImg } from './shared.js?v=33';

export function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(G.inventory).forEach(([id, qty]) => {
    if (qty <= 0) return;
    const item = ITEMS[id];
    if (!item) return;
    const div = document.createElement('div');
    div.className = `inv-item${item.rare ? ' rare' : ''}`;
    div.innerHTML = `<div class="item-qty">${qty}</div><div class="item-icon">${itemIconImg(id, 'item-icon')}</div><div class="item-name">${item.name}</div>`;
    div.onclick = () => openItemModal(id);
    grid.appendChild(div);
  });

  renderRelics();
  renderEquipmentSlots();
}

// Relíquias (ver domain/gameState.js: G.relics) — instâncias únicas, nunca
// empilhadas, então cada uma vira seu próprio card, com uma borda/glow na cor
// da raridade (ver domain/rarity.js) por cima do MESMO sprite real do item
// base (não existe sprite real de Tibia pra "versão lendária" de um item).
export function renderRelics() {
  const grid = document.getElementById('relics-grid');
  if (!grid) return;
  grid.innerHTML = '';
  (G.relics || []).forEach(relic => {
    const base = ITEMS[relic.itemId];
    if (!base) return;
    const tier = RARITY_TIERS[relic.rarity];
    const div = document.createElement('div');
    div.className = 'inv-item relic-item';
    div.style.borderColor = tier.color;
    div.style.boxShadow = `0 0 9px ${tier.color}99`;
    div.innerHTML = `<div class="item-icon">${itemIconImg(relic.itemId, 'item-icon')}</div><div class="item-name">${base.name}</div><div class="relic-tier-badge" style="color:${tier.color}">💎 ${tier.name}</div>`;
    div.onclick = () => openRelicModal(relic.id);
    grid.appendChild(div);
  });
}

export function openRelicModal(relicId) {
  const relic = (G.relics || []).find(r => r.id === relicId);
  if (!relic) return;
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const tier = RARITY_TIERS[relic.rarity];
  const statKey = primaryStatKeyForItem(base);
  const boostedVal = statKey ? Math.round(base[statKey] * (1 + relic.bonusPct)) : null;
  const equipped = Object.values(G.equipment).includes(relic.id);
  const sellPrice = Math.round(base.sell * (1 + relic.bonusPct * 2));
  openModal(`
    <h3>${itemIconImg(relic.itemId)} ${base.name}</h3>
    <p style="color:${tier.color};font-weight:700">💎 Relíquia ${tier.name} (+${Math.round(relic.bonusPct * 100)}%)</p>
    <p>${base.type}</p>
    <div class="item-detail-stats">${statKey ? `<span>${statKey.toUpperCase()} +${boostedVal}</span>` : ''}</div>
    <p style="margin-top:8px; color:#6272a4; font-size:12px">Venda: ${sellPrice} ${goldIconImg('inline-icon')}</p>
    ${!equipped ? `<button onclick="equipRelic('${relic.id}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Equipar</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${relic.id}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Desequipar</button>` : ''}
    <button onclick="sellRelic('${relic.id}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Vender (${sellPrice} ${goldIconImg('inline-icon')})</button>
  `);
}

export function openItemModal(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  const stats = ['atk', 'def', 'magic', 'heal', 'mana', 'dmg'].filter(s => item[s]).map(s => `<span>${s.toUpperCase()} +${item[s]}</span>`).join(' | ');
  const isEquippable = EQUIPPABLE_TYPES.includes(item.type);
  const isConsumable = CONSUMABLE_TYPES.includes(item.type);
  const equipped = Object.values(G.equipment).includes(itemId);
  openModal(`
    <h3>${itemIconImg(itemId)} ${item.name}</h3>
    <p>${item.type} — Qtd: ${qty}</p>
    <div class="item-detail-stats">${stats}</div>
    <p style="margin-top:8px; color:#6272a4; font-size:12px">Venda: ${item.sell} ${goldIconImg('inline-icon')}</p>
    ${isConsumable ? `<button onclick="useItem('${itemId}')" style="margin-top:8px;background:#3a7bd5;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Usar</button>` : ''}
    ${isEquippable && !equipped ? `<button onclick="equipItem('${itemId}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Equipar</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${itemId}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Desequipar</button>` : ''}
    <button onclick="sellItem('${itemId}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Vender (${item.sell} ${goldIconImg('inline-icon')})</button>
    ${qty > 1 ? `<button onclick="sellAllItem('${itemId}')" style="margin-top:6px;background:#27ae60;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Vender Todos (${qty}x — ${item.sell * qty} ${goldIconImg('inline-icon')})</button>` : ''}
  `);
}

export function renderEquipmentSlots() {
  const areas = document.querySelectorAll('.equipment-slots');
  if (!areas.length) return;
  // ordem/posições do inventário clássico do Tibia (elmo em cima, arma na mão…)
  const labels = { weapon: 'Arma', armor: 'Armadura', shield: 'Escudo', helmet: 'Elmo', ring: 'Anel', legs: 'Calças', boots: 'Botas' };
  const html = EQUIPMENT_SLOTS.map(slot => {
    const slotValue = G.equipment[slot];
    // slotValue pode ser um itemId comum OU o id de uma Relíquia — o sprite
    // exibido é sempre o do item BASE (relic.itemId), com uma borda na cor da
    // raridade por cima (ver renderRelics() acima pro mesmo padrão visual).
    const relic = slotValue && isRelicId(slotValue) ? (G.relics || []).find(r => r.id === slotValue) : null;
    const item = resolveEquippedItem(slotValue, G.relics);
    const tier = relic ? RARITY_TIERS[relic.rarity] : null;
    const clickTarget = relic ? `openRelicModal('${relic.id}')` : item ? `openItemModal('${slotValue}')` : '';
    const style = tier ? ` style="border-color:${tier.color};box-shadow:0 0 8px ${tier.color}99"` : '';
    return `<div class="equip-slot slot-${slot} ${item ? 'filled' : ''}"${style} onclick="${clickTarget}">
      <div class="equip-slot-name">${labels[slot]}</div>
      ${item ? `<div class="equip-slot-icon">${itemIconImg(relic ? relic.itemId : slotValue, 'equip-slot-icon')}</div><div class="equip-slot-item">${item.name}${relic ? ' 💎' : ''}</div>` : '<div style="color:#8a6f4d;font-size:11px;margin-top:10px">Vazio</div>'}
    </div>`;
  }).join('');
  areas.forEach(a => { a.innerHTML = html; });
}

export function wireInventoryAndEquipmentEvents() {
  on(EVENTS.INVENTORY, renderInventory);
  on(EVENTS.EQUIPMENT_SLOTS, renderEquipmentSlots);
}
