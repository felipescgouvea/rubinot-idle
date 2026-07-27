// Escolha de aparência: gênero, trocar pra um outfit já possuído, ou comprar
// um novo com Rubini Coins — igual à tela de aparência do Tibia, só que sem
// custo pros 4 outfits clássicos (ver domain/outfits.js).
import { G, ACCOUNT } from './gameStore.js?v=361';
import { findOutfit, isOutfitOwned } from '../domain/outfits.js?v=357';
import { emit, EVENTS } from '../shared/eventBus.js?v=359';
import { saveGame } from './saveGameUseCase.js?v=361';
import { spendRubiniOnServer } from '../infrastructure/authClient.js?v=369';
import { t } from '../i18n/i18n.js?v=377';

export function setOutfitGender(gender) {
  G.outfitGender = gender === 'female' ? 'female' : 'male';
  emit(EVENTS.OUTFIT_PICKER);
  emit(EVENTS.CHAR_INFO);
  saveGame();
}

export function selectOutfit(outfitId) {
  const def = findOutfit(outfitId);
  if (!def || !isOutfitOwned(outfitId, G.outfitsOwned)) {
    emit(EVENTS.NOTIFY, { msg: t('outfit.notOwned'), type: 'error' });
    return;
  }
  // clicar de novo no que já está vestindo volta pro visual padrão da vocação
  G.outfit = G.outfit === outfitId ? null : outfitId;
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}

export async function buyOutfit(outfitId) {
  const def = findOutfit(outfitId);
  if (!def || def.free || G.outfitsOwned.includes(outfitId)) return;
  if ((G.rubini || 0) < def.price) {
    emit(EVENTS.NOTIFY, { msg: t('outfit.insufficientRubini'), type: 'error' });
    return;
  }
  // #R1: gasto de Rubini AUTORITATIVO no servidor (senão o daily/BP claim reembolsa).
  const res = await spendRubiniOnServer(ACCOUNT.activeSlot, def.price);
  if (!res.ok) { emit(EVENTS.NOTIFY, { msg: res.error || t('outfit.insufficientRubini'), type: 'error' }); return; }
  G.rubini = res.rubini;
  G.outfitsOwned.push(outfitId);
  G.outfit = outfitId;
  emit(EVENTS.NOTIFY, { msg: t('outfit.boughtAndWorn', { name: def.name }), type: 'success' });
  emit(EVENTS.HEADER_STATS);
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}

// Addons são um toggle cosmético livre pro outfit atual — sem sistema de
// quest/achievement por trás (diferente do Tibia real), mesma simplificação
// já aplicada à compra de outfits (ver domain/outfits.js: "compra uma vez,
// veste livremente").
export function toggleOutfitAddon(slot) {
  if (slot === 1) G.outfitAddon1 = !G.outfitAddon1;
  else if (slot === 2) G.outfitAddon2 = !G.outfitAddon2;
  else return;
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}

// Cor por canal (cabeça/corpo/pernas/pés), igual à tela de aparência do
// Tibia — vale pro personagem, não por outfit (troca de outfit preserva as
// cores escolhidas, como no jogo real).
export function setOutfitColor(channel, hex) {
  if (!['head', 'body', 'legs', 'feet'].includes(channel)) return;
  G.outfitColors[channel] = hex;
  emit(EVENTS.CHAR_INFO);
  emit(EVENTS.OUTFIT_PICKER);
  saveGame();
}
