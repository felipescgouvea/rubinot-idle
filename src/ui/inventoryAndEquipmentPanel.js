// Inventário, modal de detalhe do item, Relíquias e os slots de equipamento
// no card da Caçada — ficam juntos porque compartilham o mesmo modelo de item
// (Relíquia é uma variação de item — ver domain/items.js: isRelicId).
import { G } from '../application/gameStore.js?v=133';
import { ITEMS, EQUIPMENT_SLOTS, EQUIPPABLE_TYPES, CONSUMABLE_TYPES, isRelicId, resolveEquippedItem, BAG_MAX_SLOTS } from '../domain/items.js?v=144';
import { RARITY_TIERS } from '../domain/rarity.js?v=130';
import { on, EVENTS } from '../shared/eventBus.js?v=131';
import { saveGame } from '../application/saveGameUseCase.js?v=133';
import { openModal, closeModal, itemIconImg, goldIconImg } from './shared.js?v=136';
import { t } from '../i18n/i18n.js?v=147';

let dragId = null; // itemId sendo arrastado no inventário

// Rótulos e conjunto de atributos comparáveis entre peças de equipamento.
const STAT_LABEL_KEYS = { atk: 'inventory.statAtk', wandDmg: 'inventory.statWandDmg', distanceBonus: 'inventory.statDist', def: 'inventory.statDef', magic: 'inventory.statMagic', heal: 'inventory.statHeal', mana: 'inventory.statMana', dmg: 'inventory.statDmg', spd: 'inventory.statSpd' };
const statLabel = s => t(STAT_LABEL_KEYS[s]);
const COMPARE_STATS = ['atk', 'wandDmg', 'distanceBonus', 'def', 'magic', 'spd'];

// Comparativo de status ao equipar: mostra, pra cada atributo relevante, o valor
// do item novo x o que já está no slot (item.type = slot), com a diferença em
// verde/vermelho. Serve tanto pra item comum quanto pra relíquia (já resolvida).
function statCompareHtml(newItem, slotType, alreadyEquipped = false) {
  const current = resolveEquippedItem(G.equipment[slotType], G.relics);
  const isEquippedItself = alreadyEquipped || current === newItem;
  const keys = COMPARE_STATS.filter(s => (newItem[s] || 0) || (current && (current[s] || 0)));
  if (!keys.length) return '';
  const rows = keys.map(s => {
    const nv = newItem[s] || 0;
    const cv = (current && !isEquippedItself) ? (current[s] || 0) : 0;
    const d = nv - cv;
    const cls = d > 0 ? 'stat-up' : d < 0 ? 'stat-down' : 'stat-same';
    const arrow = (current && !isEquippedItself) ? `${cv} → ${nv}` : `${nv}`;
    const delta = (current && !isEquippedItself && d !== 0) ? ` <span class="${cls}">(${d > 0 ? '+' : ''}${d})</span>` : '';
    return `<div class="stat-cmp-row"><span class="stat-cmp-label">${statLabel(s)}</span><span class="stat-cmp-val">${arrow}${delta}</span></div>`;
  }).join('');
  const head = isEquippedItself ? t('inventory.equipped') : current ? t('inventory.compareWith', { name: current.name }) : t('inventory.noItemInSlot');
  return `<div class="stat-cmp"><div class="stat-cmp-head">${head}</div>${rows}</div>`;
}

// Resistência elemental do item (objeto `absorb`, % por elemento). Renderiza uma
// linha "🔥 +8% ❄️ +6%" no detalhe — sem isso o jogador não sabe que aquela peça
// protege contra fogo/energia/etc. (o lever de sobrevivência no endgame). Valor
// negativo = vulnerabilidade (leva mais dano), destacado em vermelho.
// Rótulo por emoji (universal, sem i18n): 🛡️ + chips "🔥 +8%". Emoji+número já é
// autoexplicativo em qualquer idioma, evitando um bump em cascata do i18n só por
// causa deste rótulo. Positivo = resistência (verde); negativo = vulnerabilidade
// (vermelho).
const ELEMENT_ICON = { fire: '🔥', energy: '⚡', ice: '❄️', earth: '🌿', death: '💀', holy: '✨' };
function absorbHtml(item) {
  if (!item || !item.absorb) return '';
  const parts = Object.entries(item.absorb).filter(([, p]) => p).map(([el, p]) => {
    const cls = p > 0 ? 'stat-up' : 'stat-down';
    return `<span class="absorb-chip ${cls}">${ELEMENT_ICON[el] || el} ${p > 0 ? '+' : ''}${p}%</span>`;
  }).join(' ');
  if (!parts) return '';
  return `<div class="item-absorb">🛡️ ${parts}</div>`;
}

// Ordem de exibição dos itens: começa por G.inventoryOrder (escolha do
// jogador via drag), removendo o que não está mais no inventário, e acrescenta
// no fim qualquer item presente que ainda não esteja na ordem (ex.: saves
// antigos sem inventoryOrder). Pura: não muta G aqui.
function orderedInventoryIds() {
  const owned = Object.keys(G.inventory).filter(id => G.inventory[id] > 0);
  const order = (G.inventoryOrder || []).filter(id => owned.includes(id));
  owned.forEach(id => { if (!order.includes(id)) order.push(id); });
  return order;
}

// Move o item arrastado para a posição do item-alvo em G.inventoryOrder e salva.
function reorderInventory(draggedId, targetId) {
  if (!draggedId || draggedId === targetId) return;
  const order = orderedInventoryIds();
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from === -1 || to === -1) return;
  order.splice(from, 1);
  order.splice(order.indexOf(targetId) + (from < to ? 1 : 0), 0, draggedId);
  G.inventoryOrder = order;
  renderInventory();
  saveGame();
}

function renderAutoSellControls() {
  const el = document.getElementById('autosell-controls');
  if (!el) return;
  const as = G.autoSell || { enabled: false, maxValue: 50 };
  el.innerHTML = `<div class="autosell-row">
    <label class="autosell-toggle"><input type="checkbox" ${as.enabled ? 'checked' : ''} onchange="setAutoSell(this.checked)" /> 🧹 ${t('inventory.autoSellLabel')}</label>
    <span class="autosell-max">≤ <input type="number" min="0" class="autosell-input" value="${as.maxValue}" onchange="setAutoSellMax(this.value)" /> ${goldIconImg('inline-icon')}</span>
  </div>
  <div class="muted autosell-hint">${t('inventory.autoSellHint')}</div>`;
}

function renderInventory() {
  renderAutoSellControls();
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  const counter = document.getElementById('bag-slot-counter');
  if (counter) {
    const used = (G.inventoryOrder || []).length;
    counter.textContent = `(${used}/${BAG_MAX_SLOTS})`;
    counter.classList.toggle('bag-slot-counter-full', used >= BAG_MAX_SLOTS);
  }
  grid.innerHTML = '';
  // Itens EQUIPADOS não aparecem na Bag — estão "no corpo" (nos slots de
  // equipamento). Munição equipada também sai da Bag; a quantidade dela fica
  // num contador no próprio slot de munição (ver renderEquipmentSlots).
  const equippedIds = new Set(Object.values(G.equipment).filter(Boolean));
  orderedInventoryIds().forEach(id => {
    if (equippedIds.has(id)) return;
    const qty = G.inventory[id];
    const item = ITEMS[id];
    if (!item) return;
    const div = document.createElement('div');
    div.className = `inv-item${item.rare ? ' rare' : ''}`;
    div.draggable = true;
    div.dataset.itemId = id;
    div.innerHTML = `<div class="item-qty">${qty}</div><div class="item-icon">${itemIconImg(id, 'item-icon')}</div><div class="item-name">${item.name}</div>`;
    div.onclick = () => openItemModal(id, true);
    // drag-and-drop pra organizar a ordem dos itens dentro da mochila
    div.addEventListener('dragstart', e => {
      dragId = id; div.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
      // grava o itemId pra alvos de drop FORA da bag (ex.: slot de poção do RTC)
      e.dataTransfer.setData('application/x-item-id', id);
      e.dataTransfer.setData('text/plain', id);
    });
    div.addEventListener('dragend', () => { dragId = null; div.classList.remove('dragging'); grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
    div.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragId && dragId !== id) div.classList.add('drag-over'); });
    div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
    div.addEventListener('drop', e => { e.preventDefault(); div.classList.remove('drag-over'); reorderInventory(dragId, id); });
    grid.appendChild(div);
  });

  // Relíquias (ver domain/gameState.js: G.relics) ficam JUNTAS na bag, ao lado
  // dos demais itens (não numa aba separada). São instâncias únicas, nunca
  // empilhadas, então cada uma vira seu próprio card, distinguida pela borda/glow
  // na cor da raridade (ver domain/rarity.js) sobre o MESMO sprite do item base.
  (G.relics || []).forEach(relic => {
    if (equippedIds.has(relic.id)) return; // relíquia equipada mora no slot, não na Bag
    const base = ITEMS[relic.itemId];
    if (!base) return;
    const tier = RARITY_TIERS[relic.rarity];
    const div = document.createElement('div');
    div.className = 'inv-item relic-item';
    div.style.borderColor = tier.color;
    div.style.boxShadow = `0 0 9px ${tier.color}99`;
    div.innerHTML = `<div class="item-icon">${itemIconImg(relic.itemId, 'item-icon')}</div><div class="item-name">${base.name}</div><div class="relic-tier-badge" style="color:${tier.color}">${t(tier.name)}</div>`;
    div.onclick = () => openRelicModal(relic.id, true);
    grid.appendChild(div);
  });

  renderEquipmentSlots();
}

export function openRelicModal(relicId, fromBag = false) {
  itemModalOpenedFromBag = fromBag;
  const relic = (G.relics || []).find(r => r.id === relicId);
  if (!relic) return;
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const tier = RARITY_TIERS[relic.rarity];
  const resolved = resolveEquippedItem(relic.id, G.relics) || base;
  const equipped = Object.values(G.equipment).includes(relic.id);
  const sellPrice = Math.round(base.sell * (1 + relic.bonusPct * 2));
  openModal(`
    <h3>${itemIconImg(relic.itemId)} ${base.name}</h3>
    <p style="color:${tier.color};font-weight:700">${t('inventory.relicTier', { tier: t(tier.name) })}</p>
    ${EQUIPPABLE_TYPES.includes(base.type) ? statCompareHtml(resolved, base.type, equipped) : ''}
    ${absorbHtml(resolved)}
    <p style="margin-top:8px; color:#6272a4; font-size:12px">${t('inventory.sellLabel')} ${sellPrice} ${goldIconImg('inline-icon')}</p>
    ${!equipped ? `<button onclick="equipRelic('${relic.id}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">${t('inventory.equip')}</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${relic.id}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('inventory.unequip')}</button>` : ''}
    <button onclick="sellRelic('${relic.id}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('inventory.sellFor', { price: sellPrice, icon: goldIconImg('inline-icon') })}</button>
  `);
}

// true quando o modal de detalhe do item/relíquia atual foi aberto de DENTRO
// do modal da Bag (clique na lista, ver renderInventory acima) — nesse caso,
// vender/equipar/desequipar/usar deve VOLTAR pra Bag em vez de fechar tudo
// (ver EVENTS.ITEM_MODAL_DONE abaixo). Aberto pelo slot de equipamento (fora
// da Bag) fica false: aí sim fecha tudo.
let itemModalOpenedFromBag = false;

export function openItemModal(itemId, fromBag = false) {
  itemModalOpenedFromBag = fromBag;
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  const isEquippable = EQUIPPABLE_TYPES.includes(item.type);
  const isConsumable = CONSUMABLE_TYPES.includes(item.type);
  const equipped = Object.values(G.equipment).includes(itemId);
  // Equipável: mostra o COMPARATIVO de status com o que está no slot. Demais
  // itens (consumíveis/materiais): só a lista simples de atributos.
  const simpleStats = ['heal', 'mana', 'dmg'].filter(s => item[s]).map(s => `<span>${statLabel(s)} +${item[s]}</span>`).join(' | ');
  const statsHtml = isEquippable ? statCompareHtml(item, item.type, equipped) : `<div class="item-detail-stats">${simpleStats}</div>`;
  openModal(`
    <h3>${itemIconImg(itemId)} ${item.name}</h3>
    <p class="muted" style="font-size:12px">${t('inventory.qtyLabel', { qty })}</p>
    ${statsHtml}
    ${absorbHtml(item)}
    <p style="margin-top:8px; color:#6272a4; font-size:12px">${t('inventory.sellLabel')} ${item.sell} ${goldIconImg('inline-icon')}</p>
    ${isConsumable ? `<button onclick="useItem('${itemId}')" style="margin-top:8px;background:#3a7bd5;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">${t('inventory.use')}</button>` : ''}
    ${isEquippable && !equipped ? `<button onclick="equipItem('${itemId}')" style="margin-top:8px;background:#c45c1a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%;font-weight:700">${t('inventory.equip')}</button>` : ''}
    ${equipped ? `<button onclick="unequipItem('${itemId}')" style="margin-top:8px;background:#6272a4;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('inventory.unequip')}</button>` : ''}
    <button onclick="sellItem('${itemId}')" style="margin-top:6px;background:#2ecc71;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('inventory.sellFor', { price: item.sell, icon: goldIconImg('inline-icon') })}</button>
    ${qty > 1 ? `<button onclick="sellAllItem('${itemId}')" style="margin-top:6px;background:#27ae60;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;width:100%">${t('inventory.sellAllFor', { qty, total: item.sell * qty, icon: goldIconImg('inline-icon') })}</button>` : ''}
  `);
}

// Ícone-fantasma de cada slot vazio, ao estilo Tibia (silhueta acinzentada do
// que vai ali) — o CSS deixa em cinza/baixa opacidade (ver .equip-slot-ghost).
const SLOT_PLACEHOLDER = { weapon: '🗡️', armor: '🧥', shield: '🛡️', helmet: '⛑️', ammo: '🏹', ring: '💍', legs: '👖', boots: '🥾' };
const SLOT_LABEL_KEYS = { weapon: 'inventory.slotWeapon', armor: 'inventory.slotArmor', shield: 'inventory.slotShield', helmet: 'inventory.slotHelmet', ammo: 'inventory.slotAmmo', ring: 'inventory.slotRing', legs: 'inventory.slotLegs', boots: 'inventory.slotBoots' };
const slotLabel = slot => t(SLOT_LABEL_KEYS[slot]);

export function renderEquipmentSlots() {
  const areas = document.querySelectorAll('.equipment-slots');
  if (!areas.length) return;
  // ordem/posições do inventário clássico do Tibia (elmo em cima, arma na mão…).
  // Visual entalhado escuro como o cliente real: só o ícone dentro do slot;
  // o nome do item vai no tooltip (title), não em texto embaixo.
  const html = EQUIPMENT_SLOTS.map(slot => {
    const slotValue = G.equipment[slot];
    // slotValue pode ser um itemId comum OU o id de uma Relíquia — o sprite
    // exibido é sempre o do item BASE (relic.itemId), com uma borda na cor da
    // raridade por cima (ver renderRelics() acima pro mesmo padrão visual).
    const relic = slotValue && isRelicId(slotValue) ? (G.relics || []).find(r => r.id === slotValue) : null;
    const item = resolveEquippedItem(slotValue, G.relics);
    const tier = relic ? RARITY_TIERS[relic.rarity] : null;
    const clickTarget = relic ? `openRelicModal('${relic.id}')` : item ? `openItemModal('${slotValue}')` : '';
    const style = tier ? ` style="border-color:${tier.color};box-shadow:inset 0 0 6px ${tier.color}66, 0 0 8px ${tier.color}99"` : '';
    // Munição: mostra a QUANTIDADE num contador no slot (ela sai da Bag ao ser
    // equipada, então é o único lugar que mostra quantas flechas/virotes restam).
    const ammoQty = slot === 'ammo' && item ? (G.inventory[slotValue] || 0) : 0;
    const title = item ? `${item.name}${relic && tier ? ` — ${t(tier.name)}` : ''}${slot === 'ammo' ? ` (${ammoQty})` : ''}` : slotLabel(slot);
    return `<div class="equip-slot slot-${slot} ${item ? 'filled' : ''}"${style} title="${title}" onclick="${clickTarget}">
      ${item
        ? `<div class="equip-slot-icon">${itemIconImg(relic ? relic.itemId : slotValue, 'equip-slot-icon')}</div>${slot === 'ammo' ? `<div class="equip-slot-ammo-qty">${ammoQty}</div>` : ''}`
        : `<div class="equip-slot-ghost">${SLOT_PLACEHOLDER[slot]}</div>`}
    </div>`;
  }).join('');
  // Slot da Bag — guarda um item de verdade (o "bag" inicial do Tibia, ver
  // G.backpack) e funciona como container: abre a Bag num modal (ver
  // toggleBackpack abaixo). Clique esquerdo e direito fazem a mesma coisa.
  const bagId = G.backpack || 'bag';
  const bagName = (ITEMS[bagId] && ITEMS[bagId].name) || t('inventory.bagFallbackName');
  const backpackHtml = `<div class="equip-slot slot-backpack filled" title="${t('inventory.bagHintTitle', { name: bagName })}"
      onclick="toggleBackpack()" oncontextmenu="event.preventDefault(); toggleBackpack(); return false;">
      <div class="equip-slot-icon">${itemIconImg(bagId, 'equip-slot-icon')}</div>
    </div>`;
  areas.forEach(a => { a.innerHTML = html + backpackHtml; });
}

// Abre a Bag (inventário) num modal — antes era uma janela fixa ao lado do
// Equipamento; agora usa o modal genérico (ver ui/shared.js: openModal), que
// já tem seu próprio botão de fechar. Os ids internos (#inventory-grid,
// #autosell-controls, #bag-slot-counter) são os MESMOS de antes, então
// renderInventory() e renderAutoSellControls() funcionam sem mudança —
// eventos como EVENTS.INVENTORY (ex.: depois de vender um item) continuam
// atualizando o conteúdo enquanto o modal estiver aberto.
export function toggleBackpack() {
  openModal(`
    <h3>🎒 ${t('inventory.bagTitle')} <span id="bag-slot-counter" class="bag-slot-counter"></span></h3>
    <p class="muted">${t('hunt.bagHint')}</p>
    <div id="autosell-controls"></div>
    <div id="inventory-grid"></div>
  `);
  renderInventory();
}

// Vender/equipar/desequipar/usar fecha só o modal de DETALHE do item/relíquia
// — se ele tinha sido aberto de dentro da Bag, volta pra Bag (não fecha tudo);
// se veio do slot de equipamento, aí sim fecha (ver openItemModal/
// openRelicModal acima e application/inventoryUseCases.js).
function handleItemModalDone() {
  if (itemModalOpenedFromBag) toggleBackpack();
  else closeModal();
}

export function wireInventoryAndEquipmentEvents() {
  on(EVENTS.INVENTORY, renderInventory);
  on(EVENTS.EQUIPMENT_SLOTS, renderEquipmentSlots);
  on(EVENTS.ITEM_MODAL_DONE, handleItemModalDone);
}
