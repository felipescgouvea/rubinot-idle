// Escolha de aparência: gênero, trocar pra um outfit já possuído, ou comprar
// um novo com Rubini Coins — igual à tela de aparência do Tibia, só que sem
// custo pros 4 outfits clássicos (ver domain/outfits.js).
import { G } from './gameStore.js?v=12';
import { findOutfit, isOutfitOwned } from '../domain/outfits.js?v=12';
import { emit, EVENTS } from '../shared/eventBus.js?v=12';
import { saveGame } from './saveGameUseCase.js?v=12';

export function setOutfitGender(gender) {
  G.outfitGender = gender === 'female' ? 'female' : 'male';
  emit(EVENTS.OUTFIT_PICKER);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}

export function selectOutfit(outfitId) {
  const def = findOutfit(outfitId);
  if (!def || !isOutfitOwned(outfitId, G.outfitsOwned)) {
    emit(EVENTS.NOTIFY, { msg: 'Você ainda não tem esse outfit — compre primeiro.', type: 'error' });
    return;
  }
  // clicar de novo no que já está vestindo volta pro visual padrão da vocação
  G.outfit = G.outfit === outfitId ? null : outfitId;
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}

export function buyOutfit(outfitId) {
  const def = findOutfit(outfitId);
  if (!def || def.free || G.outfitsOwned.includes(outfitId)) return;
  if (G.rubini < def.price) {
    emit(EVENTS.NOTIFY, { msg: 'Rubini Coins insuficientes.', type: 'error' });
    return;
  }
  G.rubini -= def.price;
  G.outfitsOwned.push(outfitId);
  G.outfit = outfitId;
  emit(EVENTS.NOTIFY, { msg: `${def.name} comprado e vestido!`, type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}
