import { G, ACCOUNT } from './gameStore.js?v=129';
import { VOCATIONS } from '../domain/character.js?v=156';
import { STARTER_KITS, STARTER_SUPPLIES } from '../domain/items.js?v=138';
import { emit, EVENTS } from '../shared/eventBus.js?v=127';
import { addItemToInventory } from './inventoryCore.js?v=127';
import { startRegen } from './huntUseCases.js?v=184';
import { saveGame } from './saveGameUseCase.js?v=129';
import { grantStarterKit } from '../infrastructure/authClient.js?v=133';
import { t } from '../i18n/i18n.js?v=142';

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
  // supply inicial (poções/comida), fiel ao Dawnport real (ver domain/items.js)
  const supplies = STARTER_SUPPLIES[voc] || {};
  Object.entries(supplies).forEach(([itemId, qty]) => {
    for (let i = 0; i < qty; i++) addItemToInventory(itemId);
  });
  emit(EVENTS.CHAR_PANEL);
  emit(EVENTS.EQUIPMENT_SLOTS);
  emit(EVENTS.INVENTORY);
  startRegen();
  saveGame();
  // Concede o kit no SERVIDOR também (ver server/src/index.js:
  // /character/starter-kit) — sem isso o hunt-start lia player_equipment
  // vazio e computava o combate real como se o personagem estivesse
  // desarmado, mesmo mostrando o kit equipado aqui no cliente.
  grantStarterKit(ACCOUNT.activeSlot, voc).catch(() => {});
  emit(EVENTS.NOTIFY, { msg: t('character.vocationChosen', { vocation: v.name }), type: 'success' });
}
