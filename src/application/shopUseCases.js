import { G } from './gameStore.js';
import { SHOP_ITEMS, isBoostActive } from '../domain/shopCatalog.js';
import { ITEMS } from '../domain/items.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { getMaxHp, getMaxMana } from './stats.js';
import { addItemToInventory } from './inventoryCore.js';
import { saveGame } from './saveGameUseCase.js';

export function buyShopItem(id) {
  const s = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;

  // outfit já comprado = vestir/tirar
  if (s.type === 'outfit' && G.outfitsOwned.includes(s.id)) {
    G.outfit = G.outfit === s.icon ? null : s.icon;
    emit(EVENTS.SHOP_PANEL);
    emit(EVENTS.CHAR_INFO);
    saveGame();
    return;
  }

  const balance = s.currency === 'rubini' ? G.rubini : G.gold;
  if (balance < s.price) { emit(EVENTS.NOTIFY, { msg: 'Saldo insuficiente.', type: 'error' }); return; }
  if (s.currency === 'rubini') G.rubini -= s.price; else G.gold -= s.price;

  if (s.type === 'boost') {
    const now = Date.now();
    const base = isBoostActive(G.boosts, s.boost, now) ? G.boosts[s.boost] : now;
    G.boosts[s.boost] = base + s.minutes * 60000; // acumula tempo
    emit(EVENTS.NOTIFY, { msg: `${s.icon} ${s.name} ativado por ${s.minutes} min!`, type: 'success' });
  } else if (s.type === 'refill') {
    G.hp = getMaxHp();
    G.mana = getMaxMana();
    emit(EVENTS.NOTIFY, { msg: '🧪 HP e mana restaurados!', type: 'success' });
  } else if (s.type === 'item') {
    addItemToInventory(s.itemId);
    emit(EVENTS.NOTIFY, { msg: `${s.icon} ${ITEMS[s.itemId].name} comprado! Veja no inventário.`, type: 'success' });
  } else if (s.type === 'outfit') {
    G.outfitsOwned.push(s.id);
    G.outfit = s.icon;
    emit(EVENTS.NOTIFY, { msg: `${s.icon} Outfit adquirido e equipado!`, type: 'success' });
  }

  emit(EVENTS.SHOP_PANEL);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}
