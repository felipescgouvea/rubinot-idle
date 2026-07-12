import { G } from './gameStore.js?v=106';
import { VOCATIONS } from '../domain/character.js?v=106';
import { STARTER_KITS } from '../domain/items.js?v=106';
import { emit, EVENTS } from '../shared/eventBus.js?v=106';
import { addItemToInventory } from './inventoryCore.js?v=106';
import { startRegen } from './huntUseCases.js?v=106';
import { saveGame } from './saveGameUseCase.js?v=106';

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
