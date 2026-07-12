import { G } from './gameStore.js?v=95';
import { ITEMS, resolveEquippedItem, potionUseBlockReason, equipBlockReason } from '../domain/items.js?v=95';
import { ZONES } from '../domain/bestiary.js?v=95';
import { RARITY_TIERS } from '../domain/rarity.js?v=95';
import { emit, EVENTS } from '../shared/eventBus.js?v=95';
import { getMaxHp, getMaxMana, getMagic } from './stats.js?v=95';
import { canUseAttackRune, runeMinMl } from '../domain/rtcConfig.js?v=95';
import { getCurrentMonster, getCurrentPack, resolveMonsterKill } from './huntUseCases.js?v=95';
import { areaMaxTargets, areaName, isAreaAttack } from '../domain/attackAreas.js?v=95';
import { saveGame } from './saveGameUseCase.js?v=95';
import { itemSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=95';

function itemLogIcon(itemId) {
  const item = ITEMS[itemId];
  return `<img src="${spriteUrl(itemSpriteFile(itemId))}" alt="${item.name}" class="inline-icon"
    onerror="this.outerHTML='<span>${item.icon}</span>'" />`;
}

export { addItemToInventory } from './inventoryCore.js?v=95';

// Auto-vender lixo (loot): liga/desliga e define o valor máximo do que é "lixo".
// Aplicado no loot em application/huntUseCases.js.
export function setAutoSell(enabled) {
  G.autoSell = G.autoSell || { enabled: false, maxValue: 50 };
  G.autoSell.enabled = !!enabled;
  emit(EVENTS.INVENTORY);
  emit(EVENTS.NOTIFY, { msg: G.autoSell.enabled ? '🧹 Auto-vender lixo ligado.' : '🧹 Auto-vender lixo desligado.' });
  saveGame();
}
export function setAutoSellMax(value) {
  G.autoSell = G.autoSell || { enabled: false, maxValue: 50 };
  G.autoSell.maxValue = Math.max(0, Math.floor(Number(value) || 0));
  emit(EVENTS.INVENTORY);
  saveGame();
}

export function equipItem(itemId) {
  const item = ITEMS[itemId];
  // Restrição de vocação: cada profissão só empunha a sua classe de arma (e só
  // o paladino usa munição) — ver domain/items.js: canVocationEquip.
  const block = equipBlockReason(item, G.vocation);
  if (block) { emit(EVENTS.NOTIFY, { msg: `${item.name}: ${block}.`, type: 'error' }); return; }
  G.equipment[item.type] = itemId;
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `${item.name} equipado!`, type: 'success' });
  saveGame();
}

// Desequipa tanto um itemId comum quanto o id de uma Relíquia (formato
// "relic_<n>") — resolveEquippedItem() é o único ponto que sabe diferenciar
// os dois formatos (ver domain/items.js), então este caso de uso continua
// igual pros dois casos: só descobre em qual slot.type mexer.
export function unequipItem(itemId) {
  const item = resolveEquippedItem(itemId, G.relics);
  if (!item) return;
  G.equipment[item.type] = null;
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `${item.name} desequipado.` });
  saveGame();
}

// Equipar uma Relíquia (ver domain/gameState.js: G.relics) — mesmo padrão de
// equipItem, mas o valor guardado no slot é o id da relíquia, não o itemId.
export function equipRelic(relicId) {
  const relic = (G.relics || []).find(r => r.id === relicId);
  if (!relic) return;
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const block = equipBlockReason(base, G.vocation);
  if (block) { emit(EVENTS.NOTIFY, { msg: `${base.name}: ${block}.`, type: 'error' }); return; }
  G.equipment[base.type] = relicId;
  const tier = RARITY_TIERS[relic.rarity];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `${base.name} (${tier.name}) equipado!`, type: 'success' });
  saveGame();
}

// Vender uma Relíquia é definitivo — some de G.relics e paga em gold, com um
// preço maior que o item base (a raridade conta pra mais que o dobro do peso
// do bônus no preço final, pra recompensar quem preferir vender uma relíquia
// que não precisa em vez de guardar).
export function sellRelic(relicId) {
  const idx = (G.relics || []).findIndex(r => r.id === relicId);
  if (idx === -1) return;
  const relic = G.relics[idx];
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const price = Math.round(base.sell * (1 + relic.bonusPct * 2));
  // se a relíquia vendida estava equipada, o slot não pode continuar
  // apontando pra um id que não existe mais
  if (G.equipment[base.type] === relicId) G.equipment[base.type] = null;
  G.relics.splice(idx, 1);
  G.gold += price;
  const tier = RARITY_TIERS[relic.rarity];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `Vendida relíquia ${base.name} (${tier.name}) por ${price} 💰`, type: 'success' });
  saveGame();
}

export function sellItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (qty <= 0) return;
  G.gold += item.sell;
  G.inventory[itemId]--;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.NOTIFY, { msg: `Vendido ${item.name} por ${item.sell} 💰`, type: 'success' });
  saveGame();
}

export function sellAllItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (qty <= 0) return;
  const total = item.sell * qty;
  G.gold += total;
  delete G.inventory[itemId];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.NOTIFY, { msg: `Vendido ${qty}x ${item.name} por ${total} 💰`, type: 'success' });
  saveGame();
}

// Consome poção/runa/comida do inventário. Poções e comida curam HP/mana na hora;
// runas de ataque (com "dmg") só funcionam com uma criatura em combate — como usar
// uma runa mirando o alvo em Tibia — e runas de cura restauram HP a qualquer momento.
export function useItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (!item || qty <= 0 || !G.vocation) return;

  // Nível/vocação mínimos pra usar a poção (fiel ao Tibia — ver domain/items.js).
  const blockReason = potionUseBlockReason(item, G.vocation, G.level);
  if (blockReason) { emit(EVENTS.NOTIFY, { msg: `${item.name}: ${blockReason}`, type: 'error' }); return; }

  const currentMonster = getCurrentMonster();
  let runeDeaths = null;
  if (item.dmg) {
    // Runa de ataque exige a vocação certa E o Magic Level mínimo (fiel ao Tibia
    // — o mesmo gate do RTC; ver domain/rtcConfig.js: canUseAttackRune).
    if (item.type === 'rune' && !canUseAttackRune(itemId, G.vocation, getMagic())) {
      emit(EVENTS.NOTIFY, { msg: `${item.name}: sua vocação/Magic Level não permite usar essa runa (precisa ML ${runeMinMl(itemId)}).`, type: 'error' });
      return;
    }
    if (!currentMonster) { emit(EVENTS.NOTIFY, { msg: 'Sem criatura em combate para mirar a runa.', type: 'error' }); return; }
    // Runa mirada manualmente respeita a mesma FORMA de área da runa (ver
    // domain/attackAreas.js): SD acerta só o alvo; Avalanche/GFB pegam a sala.
    const pack = getCurrentPack();
    const areaId = item.area || 'single';
    const targets = isAreaAttack(areaId) ? pack.slice(0, areaMaxTargets(areaId)) : [currentMonster];
    targets.forEach(t => {
      t.hp -= item.dmg;
      emit(EVENTS.LOG, { html: `📜 <span class="log-dmg">Você usou ${item.name}: ${item.dmg} de dano em ${t.name}.</span>`, cat: 'suprimento' });
    });
    if (isAreaAttack(areaId) && targets.length > 1) {
      emit(EVENTS.LOG, { html: `<span class="log-info">🎯 ${areaName(areaId)}: atingiu ${targets.length} criaturas.</span>`, cat: 'combate' });
    }
    runeDeaths = targets.filter(t => t.hp <= 0);
  }
  if (item.heal) {
    const before = G.hp;
    G.hp = Math.min(getMaxHp(), G.hp + item.heal);
    emit(EVENTS.LOG, { html: `${itemLogIcon(itemId)} <span class="log-heal">Você usou ${item.name}: +${G.hp - before} HP.</span>`, cat: 'suprimento' });
  }
  if (item.mana) {
    const before = G.mana;
    G.mana = Math.min(getMaxMana(), G.mana + item.mana);
    emit(EVENTS.LOG, { html: `${itemLogIcon(itemId)} <span class="log-heal">Você usou ${item.name}: +${G.mana - before} mana.</span>`, cat: 'suprimento' });
  }

  G.inventory[itemId]--;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);

  if (runeDeaths && runeDeaths.length > 0) {
    const zone = ZONES[G.activeZone];
    runeDeaths.forEach(m => resolveMonsterKill(zone, m));
  } else {
    emit(EVENTS.MONSTER_DISPLAY, {});
  }
  saveGame();
}
