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

// Atlas de CAMINHADA (base + template por quadro, direção frontal) usado pra
// recolorir e animar o boneco com as cores do jogador — ver
// infrastructure/outfitWalkRenderer.js.
export function outfitWalkAtlasPath(outfitId, gender) {
  // ?av (atlas version) — independente do ?v dos módulos pra o bump global não
  // re-baixar os atlases (1.4MB) à toa. Bumpe só ao mudar o conteúdo do atlas.
  return `assets/outfits-walk/${outfitId}-${gender}.png?av=1`;
}
