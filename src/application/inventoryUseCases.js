import { G } from './gameStore.js?v=19';
import { ITEMS } from '../domain/items.js?v=19';
import { ZONES } from '../domain/bestiary.js?v=19';
import { emit, EVENTS } from '../shared/eventBus.js?v=19';
import { getMaxHp, getMaxMana } from './stats.js?v=19';
import { getCurrentMonster, resolveMonsterKill } from './huntUseCases.js?v=19';
import { saveGame } from './saveGameUseCase.js?v=19';

export { addItemToInventory } from './inventoryCore.js?v=19';

export function equipItem(itemId) {
  const item = ITEMS[itemId];
  G.equipment[item.type] = itemId;
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `${item.name} equipado!`, type: 'success' });
  saveGame();
}

export function unequipItem(itemId) {
  const item = ITEMS[itemId];
  G.equipment[item.type] = null;
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: `${item.name} desequipado.` });
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

// Consome poção/runa/comida do inventário. Poções e comida curam HP/mana na hora;
// runas de ataque (com "dmg") só funcionam com uma criatura em combate — como usar
// uma runa mirando o alvo em Tibia — e runas de cura restauram HP a qualquer momento.
export function useItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (!item || qty <= 0 || !G.vocation) return;

  const currentMonster = getCurrentMonster();
  let killedByRune = false;
  if (item.dmg) {
    if (!currentMonster) { emit(EVENTS.NOTIFY, { msg: 'Sem criatura em combate para mirar a runa.', type: 'error' }); return; }
    currentMonster.hp -= item.dmg;
    emit(EVENTS.LOG, `📜 <span class="log-dmg">Você usou ${item.name}: ${item.dmg} de dano em ${currentMonster.name}.</span>`);
    if (currentMonster.hp <= 0) killedByRune = true;
  }
  if (item.heal) {
    const before = G.hp;
    G.hp = Math.min(getMaxHp(), G.hp + item.heal);
    emit(EVENTS.LOG, `${item.icon} <span class="log-heal">Você usou ${item.name}: +${G.hp - before} HP.</span>`);
  }
  if (item.mana) {
    const before = G.mana;
    G.mana = Math.min(getMaxMana(), G.mana + item.mana);
    emit(EVENTS.LOG, `${item.icon} <span class="log-heal">Você usou ${item.name}: +${G.mana - before} mana.</span>`);
  }

  G.inventory[itemId]--;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  emit(EVENTS.MODAL_CLOSE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);

  if (killedByRune) {
    resolveMonsterKill(ZONES[G.activeZone]);
  } else {
    emit(EVENTS.MONSTER_DISPLAY, {});
  }
  saveGame();
}
