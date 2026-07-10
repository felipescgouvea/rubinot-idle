// Inventário, modal de detalhe do item e os slots de equipamento no card da
// Caçada — os três ficam juntos porque compartilham o mesmo modelo de item.
import { G } from '../application/gameStore.js?v=14';
import { ITEMS, EQUIPMENT_SLOTS, EQUIPPABLE_TYPES, CONSUMABLE_TYPES } from '../domain/items.js?v=14';
import { on, EVENTS } from '../shared/eventBus.js?v=14';
import { openModal, itemIconImg } from './shared.js?v=14';

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

  renderEquipmentSlots();
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
    <p style="margin-top:8px; color:#6272a4; font-size:12px">Venda: ${item.sell} 💰</p>
    ${isConsumable ? `<button onclick="useItem('${itemId}')" style="margin-top:8px;background:#3a7bd5;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Usar</button>` : ''}
    ${isEquippable && !equipped ? `<button onclick="equipItem('${itemId}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">Equipar</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${itemId}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Desequipar</button>` : ''}
    <button onclick="sellItem('${itemId}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">Vender (${item.sell} 💰)</button>
  `);
}

export function renderEquipmentSlots() {
  const areas = document.querySelectorAll('.equipment-slots');
  if (!areas.length) return;
  // ordem/posições do inventário clássico do Tibia (elmo em cima, arma na mão…)
  const labels = { weapon: 'Arma', armor: 'Armadura', shield: 'Escudo', helmet: 'Elmo', ring: 'Anel', legs: 'Calças', boots: 'Botas' };
  const html = EQUIPMENT_SLOTS.map(slot => {
    const itemId = G.equipment[slot];
    const item = itemId ? ITEMS[itemId] : null;
    return `<div class="equip-slot slot-${slot} ${item ? 'filled' : ''}" onclick="${item ? `openItemModal('${itemId}')` : ''}">
      <div class="equip-slot-name">${labels[slot]}</div>
      ${item ? `<div class="equip-slot-icon">${itemIconImg(itemId, 'equip-slot-icon')}</div><div class="equip-slot-item">${item.name}</div>` : '<div style="color:#8a6f4d;font-size:11px;margin-top:10px">Vazio</div>'}
    </div>`;
  }).join('');
  areas.forEach(a => { a.innerHTML = html; });
}

export function wireInventoryAndEquipmentEvents() {
  on(EVENTS.INVENTORY, renderInventory);
  on(EVENTS.EQUIPMENT_SLOTS, renderEquipmentSlots);
}
