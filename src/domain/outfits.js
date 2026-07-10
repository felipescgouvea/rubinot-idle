// Outfits reais do Tibia, escolhíveis livremente (como na tela de aparência
// do próprio jogo) — id em minúsculas corresponde ao looktype do outfit no
// cliente real (sprites e templates de recoloração ficam em assets/outfits/,
// ver infrastructure/outfitAssets.js e outfitRenderer.js).
// Os 4 marcados como "free" são os clássicos disponíveis desde a criação do
// personagem; os demais são cosméticos comprados com Rubini Coins, uma vez só.
export const OUTFITS = [
  { id: 'citizen',   name: 'Citizen',   free: true },
  { id: 'hunter',    name: 'Hunter',    free: true },
  { id: 'mage',      name: 'Mage',      free: true },
  { id: 'knight',    name: 'Knight',    free: true },
  { id: 'nobleman',  name: 'Nobleman',  free: false, price: 120 },
  { id: 'summoner',  name: 'Summoner',  free: false, price: 120 },
  { id: 'warrior',   name: 'Warrior',   free: false, price: 120 },
  { id: 'barbarian', name: 'Barbarian', free: false, price: 150 },
  { id: 'druid',     name: 'Druid',     free: false, price: 150 },
  { id: 'wizard',    name: 'Wizard',    free: false, price: 150 },
  { id: 'oriental',  name: 'Oriental',  free: false, price: 180 },
  { id: 'pirate',    name: 'Pirate',    free: false, price: 180 },
  { id: 'assassin',  name: 'Assassin',  free: false, price: 220 },
  { id: 'shaman',    name: 'Shaman',    free: false, price: 220 },
];

export function findOutfit(outfitId) {
  return OUTFITS.find(o => o.id === outfitId) || null;
}

export function isOutfitOwned(outfitId, outfitsOwned) {
  const def = findOutfit(outfitId);
  return !!def && (def.free || outfitsOwned.includes(outfitId));
}

// Aparência padrão da vocação antes do jogador escolher um outfit próprio —
// todos reais e verificados (o mesmo catálogo acima), sem custo.
export const VOCATION_DEFAULT_OUTFIT = {
  knight: 'knight',
  paladin: 'hunter',
  sorcerer: 'wizard',
  druid: 'druid',
};
