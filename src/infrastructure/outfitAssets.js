// Sprites reais de outfit extraídos do cliente do Tibia (looktype IDs
// confirmados via infobox oficial do TibiaWiki) e versionados localmente em
// assets/outfits/ — diferente de tibiaSprites.js (hotlink da wiki), aqui
// precisamos do PNG alinhado pixel a pixel com sua máscara "template" para
// recolorir por região (ver infrastructure/outfitRenderer.js), o que a wiki
// não hospeda como arquivo separado.
//
// addonIndex: 1 = visual base (sem addon), 2 = overlay do addon 1,
// 3 = overlay do addon 2 — mesma convenção do cliente original.
const BASE = 'assets/outfits/';

export function outfitAssetPath(outfitId, gender, addonIndex) {
  return `${BASE}${outfitId}-${gender}-${addonIndex}.png`;
}

export function outfitTemplatePath(outfitId, gender, addonIndex) {
  return `${BASE}${outfitId}-${gender}-${addonIndex}-template.png`;
}

// Sprite ANIMADO de caminhada do outfit (webp de 4 frames extraído do
// TibiaWiki e self-hostado em assets/outfits-anim/) — usado na cena de batalha
// pra o boneco andar de verdade. Vem com as cores padrão do Tibia (não dá pra
// recolorir um webp animado no cliente); a recoloração por cor escolhida
// continua no retrato do personagem (canvas, ver infrastructure/outfitRenderer.js).
export function outfitAnimPath(outfitId, gender) {
  return `assets/outfits-anim/${outfitId}-${gender}.webp`;
}
