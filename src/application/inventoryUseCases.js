import { G, ACCOUNT } from './gameStore.js?v=226';
import { syncEquipment, useItemOnServer, sellItemOnServer, sellRelicOnServer } from '../infrastructure/authClient.js?v=231';
import { ITEMS, resolveEquippedItem, potionUseBlockReason, equipBlockReason } from '../domain/items.js?v=237';
import { RARITY_TIERS } from '../domain/rarity.js?v=223';
import { emit, EVENTS } from '../shared/eventBus.js?v=224';
import { getMagic } from './stats.js?v=223';
import { canUseAttackRune, runeMinMl } from '../domain/rtcConfig.js?v=256';
import { getCurrentMonster } from './huntUseCases.js?v=290';
import { areaName } from '../domain/attackAreas.js?v=222';
import { saveGame } from './saveGameUseCase.js?v=226';
import { itemLogIcon } from './logIcons.js?v=225';
import { t } from '../i18n/i18n.js?v=240';

export { addItemToInventory } from './inventoryCore.js?v=224';

// Auto-vender lixo (loot): liga/desliga e define o valor máximo do que é "lixo".
// Aplicado no loot em application/huntUseCases.js.
export function setAutoSell(enabled) {
  G.autoSell = G.autoSell || { enabled: false, maxValue: 50 };
  G.autoSell.enabled = !!enabled;
  emit(EVENTS.INVENTORY);
  emit(EVENTS.NOTIFY, { msg: G.autoSell.enabled ? t('inventory.autoSellOn') : t('inventory.autoSellOff') });
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
  const block = equipBlockReason(item, G.vocation, t, G.level);
  if (block) { emit(EVENTS.NOTIFY, { msg: t('inventory.equipBlocked', { item: item.name, reason: block }), type: 'error' }); return; }
  G.equipment[item.type] = itemId;
  if (G.imbuements) delete G.imbuements[item.type]; // trocar de item perde o imbuement (ver server /equip)
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: t('inventory.itemEquipped', { item: item.name }), type: 'success' });
  saveGame();
  // Confirma no servidor (valida posse — ver server/src/index.js: /equip). Se
  // recusar, o próximo hunt-start simplesmente não usa esse item pro
  // cálculo de atk/def/spd; a UI local já mudou, mas sem efeito real.
  syncEquipment(ACCOUNT.activeSlot, item.type, itemId);
}

// Desequipa tanto um itemId comum quanto o id de uma Relíquia (formato
// "relic_<n>") — resolveEquippedItem() é o único ponto que sabe diferenciar
// os dois formatos (ver domain/items.js), então este caso de uso continua
// igual pros dois casos: só descobre em qual slot.type mexer.
export function unequipItem(itemId) {
  const item = resolveEquippedItem(itemId, G.relics);
  if (!item) return;
  G.equipment[item.type] = null;
  if (G.imbuements) delete G.imbuements[item.type];
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: t('inventory.itemUnequipped', { item: item.name }) });
  saveGame();
  syncEquipment(ACCOUNT.activeSlot, item.type, null);
}

// Equipar uma Relíquia (ver domain/gameState.js: G.relics) — mesmo padrão de
// equipItem, mas o valor guardado no slot é o id da relíquia, não o itemId.
export function equipRelic(relicId) {
  const relic = (G.relics || []).find(r => r.id === relicId);
  if (!relic) return;
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const block = equipBlockReason(base, G.vocation, t, G.level);
  if (block) { emit(EVENTS.NOTIFY, { msg: t('inventory.equipBlocked', { item: base.name, reason: block }), type: 'error' }); return; }
  G.equipment[base.type] = relicId;
  if (G.imbuements) delete G.imbuements[base.type];
  const tier = RARITY_TIERS[relic.rarity];
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: t('inventory.relicEquipped', { item: base.name, tier: t(tier.name) }), type: 'success' });
  saveGame();
  syncEquipment(ACCOUNT.activeSlot, base.type, relicId);
}

// Vender uma Relíquia é definitivo — some de G.relics e paga em gold, com um
// preço maior que o item base (a raridade conta pra mais que o dobro do peso
// do bônus no preço final, pra recompensar quem preferir vender uma relíquia
// que não precisa em vez de guardar). AUTORITATIVO no servidor (ver
// server/src/index.js: /inventory/sell-relic) — antes G.gold/G.relics só
// mutavam aqui e o próximo reconcileWithServer() revertia a venda em
// silêncio (achado na varredura de QA).
export async function sellRelic(relicId) {
  const idx = (G.relics || []).findIndex(r => r.id === relicId);
  if (idx === -1) return;
  const relic = G.relics[idx];
  const base = ITEMS[relic.itemId];
  if (!base) return;
  const res = await sellRelicOnServer(ACCOUNT.activeSlot, relicId);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: res.error || t('inventory.useBlocked', { item: base.name, reason: '' }), type: 'error' }); return; }
  // se a relíquia vendida estava equipada, o slot não pode continuar
  // apontando pra um id que não existe mais (servidor já limpou o dele)
  if (G.equipment[base.type] === relicId) G.equipment[base.type] = null;
  G.relics.splice(idx, 1);
  G.gold = res.gold;
  const tier = RARITY_TIERS[relic.rarity];
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.NOTIFY, { msg: t('inventory.relicSold', { item: base.name, tier: t(tier.name), price: res.price }), type: 'success' });
  saveGame();
}

// EVENTS.ITEM_MODAL_DONE (não MODAL_CLOSE) de propósito, aqui e em
// equipItem/unequipItem/equipRelic/sellRelic/useItem: o modal de detalhe do
// item/relíquia pode ter sido aberto de DENTRO do modal da Bag (ver
// ui/inventoryAndEquipmentPanel.js: toggleBackpack/openItemModal/
// openRelicModal, que agora compartilham o mesmo modal genérico) — fechar
// tudo incondicionalmente levaria a Bag junto. Quem decide se volta pra Bag
// ou fecha de vez é a UI, que sabe de onde o modal foi aberto.
// AUTORITATIVO no servidor (ver server/src/index.js: /inventory/sell) — mesmo
// motivo de sellRelic acima: G.gold/G.inventory só mutando aqui era revertido
// pelo próximo reconcileWithServer() (achado na varredura de QA).
export async function sellItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (qty <= 0) return;
  // Tira da bag ANTES do round-trip: a venda só aparecia depois da resposta do
  // servidor e a bag ficava segundos sem reagir ao clique. Se o servidor
  // recusar, devolve o item.
  G.inventory[itemId]--;
  if (G.inventory[itemId] <= 0) delete G.inventory[itemId];
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  const res = await sellItemOnServer(ACCOUNT.activeSlot, itemId, 1);
  if (!res.ok) {
    G.inventory[itemId] = (G.inventory[itemId] || 0) + 1;
    emit(EVENTS.INVENTORY);
    emit(EVENTS.NOTIFY, { msg: res.error || t('inventory.useBlocked', { item: item.name, reason: '' }), type: 'error' });
    return;
  }
  G.gold = res.gold;                                   // gold é sempre do servidor
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.NOTIFY, { msg: t('inventory.itemSold', { item: item.name, price: item.sell }), type: 'success' });
  saveGame();
}

export async function sellAllItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (qty <= 0) return;
  const res = await sellItemOnServer(ACCOUNT.activeSlot, itemId);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: res.error || t('inventory.useBlocked', { item: item.name, reason: '' }), type: 'error' }); return; }
  G.gold = res.gold;
  delete G.inventory[itemId];
  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.NOTIFY, { msg: t('inventory.itemSoldAll', { qty: res.sold, item: item.name, price: res.total }), type: 'success' });
  saveGame();
}

// Consome poção/runa/comida do inventário. Poções e comida curam HP/mana na hora;
// runas de ataque (com "dmg") só funcionam com uma criatura em combate — como usar
// uma runa mirando o alvo em Tibia — e runas de cura restauram HP a qualquer momento.
export async function useItem(itemId) {
  const item = ITEMS[itemId];
  const qty = G.inventory[itemId] || 0;
  if (!item || qty <= 0 || !G.vocation) return;

  // Nível/vocação mínimos pra usar a poção (fiel ao Tibia — ver domain/items.js).
  // Checagem local só pra feedback instantâneo: quem decide de VERDADE é o
  // servidor logo abaixo (useItemOnServer), que confere tudo de novo.
  const blockReason = potionUseBlockReason(item, G.vocation, G.level);
  if (blockReason) { emit(EVENTS.NOTIFY, { msg: t('inventory.useBlocked', { item: item.name, reason: blockReason }), type: 'error' }); return; }

  const currentMonster = getCurrentMonster();
  if (item.dmg) {
    // Runa de ataque exige a vocação certa E o Magic Level mínimo (fiel ao Tibia
    // — o mesmo gate do RTC; ver domain/rtcConfig.js: canUseAttackRune).
    if (item.type === 'rune' && !canUseAttackRune(itemId, G.vocation, getMagic())) {
      emit(EVENTS.NOTIFY, { msg: t('inventory.runeVocationBlocked', { item: item.name, ml: runeMinMl(itemId) }), type: 'error' });
      return;
    }
    if (!currentMonster) { emit(EVENTS.NOTIFY, { msg: t('inventory.noCreatureToTarget'), type: 'error' }); return; }
  }

  // Ação AUTORITATIVA (ver server/src/huntEngine.js: useItemInSession) — o
  // servidor confere posse/nível/vocação/ML de novo (não confia no que já
  // passou nas checagens locais acima) e é quem decide hp/mana reais e, pra
  // runa, dano/morte, reaproveitando o MESMO settleKill() do tick automático.
  // Isso fecha o mesmo buraco que o hunt-tick automático já tinha corrigido:
  // clicar um item na Bag mutava G.hp/G.mana/G.gold/G.inventory só no
  // cliente, sem o servidor nunca confirmar nada.
  const res = await useItemOnServer(ACCOUNT.activeSlot, itemId);
  if (!res.ok) {
    emit(EVENTS.NOTIFY, { msg: t('inventory.useBlocked', { item: item.name, reason: res.error || '' }), type: 'error' });
    return;
  }

  // Feedback cosmético com os números REAIS que o servidor devolveu — gold/
  // xp/loot/relíquia de uma eventual morte já foram creditados lá dentro
  // (settleKill) e chegam no cliente pelo próximo reconcileWithServer()
  // (huntUseCases.js), junto com hp/mana/inventário definitivos.
  if (item.dmg) {
    if (res.dmg != null) {
      emit(EVENTS.LOG, { html: `📜 ${t('inventory.logRuneDamage', { item: item.name, dmg: res.dmg, target: res.targetName || currentMonster.name })}`, cat: 'suprimento' });
    }
    if (res.hitCount > 1) {
      emit(EVENTS.LOG, { html: t('inventory.logAreaHit', { area: areaName(item.area || 'single', t), count: res.hitCount }), cat: 'combate' });
    }
  }
  if (item.heal && res.healedHp != null) {
    emit(EVENTS.LOG, { html: `${itemLogIcon(itemId)} ${t('inventory.logHealHp', { item: item.name, amount: res.healedHp })}`, cat: 'suprimento' });
  }
  if (item.mana && res.healedMana != null) {
    emit(EVENTS.LOG, { html: `${itemLogIcon(itemId)} ${t('inventory.logHealMana', { item: item.name, amount: res.healedMana })}`, cat: 'suprimento' });
  }
  if (res.hp != null) G.hp = res.hp;
  if (res.mana != null) G.mana = res.mana;

  emit(EVENTS.ITEM_MODAL_DONE);
  emit(EVENTS.INVENTORY);
  emit(EVENTS.BARS);
  emit(EVENTS.HEADER_STATS);
  if (!(item.dmg && res.killed)) emit(EVENTS.MONSTER_DISPLAY, {});
  saveGame();
}
