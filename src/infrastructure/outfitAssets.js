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

// Atlas de CAMINHADA (base + template por quadro) usado pra recolorir e animar
// o boneco com as cores do jogador — ver infrastructure/outfitWalkRenderer.js.
// Usa a direção NORTE (de costas): na cena de batalha o boneco fica embaixo
// encarando os monstros lá em cima, então mostra as costas (olhando pra cima).
// Este atlas é usado SÓ na cena de batalha — o retrato/loja de outfit usam os
// PNGs frontais de assets/outfits/ (ver infrastructure/outfitRenderer.js).
export function outfitWalkAtlasPath(outfitId, gender) {
  // ?av (atlas version) — independente do ?v dos módulos pra o bump global não
  // re-baixar os atlases (1.4MB) à toa. Bumpe só ao mudar o conteúdo do atlas.
  return `assets/outfits-walk-north/${outfitId}-${gender}.png?av=2`;
}

// Mesma coisa na direção SUL (de frente, mostrando o rosto). Usado no palco do
// Treino Online do mago, onde o boneco fica virado pra baixo lançando a magia.
// Só existem estas DUAS direções nos atlases (norte e sul) — não há leste/oeste.
export function outfitWalkAtlasPathSouth(outfitId, gender) {
  return `assets/outfits-walk/${outfitId}-${gender}.png?av=2`;
}
