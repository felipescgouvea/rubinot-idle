import { G } from './gameStore.js';
import { VOCATIONS } from '../domain/character.js';
import { STARTER_KITS } from '../domain/items.js';
import { emit, EVENTS } from '../shared/eventBus.js';
import { addItemToInventory } from './inventoryCore.js';
import { startRegen } from './huntUseCases.js';
import { saveGame } from './saveGameUseCase.js';

export function selectVocation(voc) {
  if (G.vocation) return;
  G.vocation = voc;
  const v = VOCATIONS[voc];
  G.hp = v.baseHp;
  G.mana = v.baseMana;
  // kit inicial da vocação, como o equipamento entregue a um personagem recém-criado no RubinOT
  const kit = STARTER_KITS[voc] || {};
  Object.entries(kit).forEach(([slot, itemId]) => {
    addItemToInventory(itemId);
    G.equipment[slot] = itemId;
  });
  emit(EVENTS.CHAR_PANEL);
  emit(EVENTS.EQUIPMENT_SLOTS);
  emit(EVENTS.INVENTORY);
  startRegen();
  saveGame();
  emit(EVENTS.NOTIFY, { msg: `Vocação ${v.name} escolhida! Kit inicial equipado.`, type: 'success' });
}
