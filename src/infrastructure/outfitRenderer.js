// Recolorização real do outfit, por região — o mesmo algoritmo do cliente do
// Tibia: cada sprite vem acompanhado de uma máscara "template" onde amarelo
// marca a cabeça, vermelho o corpo, verde as pernas e azul os pés; cada pixel
// da região marcada é multiplicado pela cor escolhida naquele canal (ver
// domain/outfitColors.js pra paleta). Addons são sobrepostos (compositados)
// antes da coloração, exatamente como no jogo real.
import { outfitAssetPath, outfitTemplatePath , outfitDirPath, outfitDirTemplatePath } from './outfitAssets.js?v=229';

const SIZE = 64;
const imageCache = new Map();

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`falha ao carregar ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function hexToRgb(hex) {
  const h = String(hex || 'FFFFFF').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function compositeLayers(images) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  images.forEach(img => ctx.drawImage(img, 0, 0, SIZE, SIZE));
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

// Multiplica cada pixel marcado no template pela cor do canal correspondente
// — porta direta do Outfit::colorize()/colorizePixel() da lib tibia-outfitter.
function colorizeInPlace(imgData, tplData, colors) {
  const px = imgData.data, tpl = tplData.data;
  const head = hexToRgb(colors.head), body = hexToRgb(colors.body);
  const legs = hexToRgb(colors.legs), feet = hexToRgb(colors.feet);
  for (let i = 0; i < px.length; i += 4) {
    const rt = tpl[i], gt = tpl[i + 1], bt = tpl[i + 2];
    let c = null;
    if (rt && gt && !bt) c = head;
    else if (rt && !gt && !bt) c = body;
    else if (!rt && gt && !bt) c = legs;
    else if (!rt && !gt && bt) c = feet;
    if (!c) continue;
    px[i] = Math.round(px[i] * (c[0] / 255));
    px[i + 1] = Math.round(px[i + 1] * (c[1] / 255));
    px[i + 2] = Math.round(px[i + 2] * (c[2] / 255));
  }
}

// Desenha o outfit recolorido (base + addons ativos) no canvas de destino
// (64x64). Retorna true em caso de sucesso; false se algum sprite falhar ao
// carregar, pra quem chamou cair no fallback de emoji.
export async function renderOutfitToCanvas(canvas, { outfitId, gender, addon1, addon2, colors }) {
  try {
    const layers = [1];
    if (addon1) layers.push(2);
    if (addon2) layers.push(3);

    const [images, templates] = await Promise.all([
      Promise.all(layers.map(n => loadImage(outfitAssetPath(outfitId, gender, n)))),
      Promise.all(layers.map(n => loadImage(outfitTemplatePath(outfitId, gender, n)))),
    ]);

    const imgData = compositeLayers(images);
    const tplData = compositeLayers(templates);
    colorizeInPlace(imgData, tplData, colors || {});

    canvas.width = SIZE;
    canvas.height = SIZE;
    const outCtx = canvas.getContext('2d');
    outCtx.imageSmoothingEnabled = false;
    outCtx.putImageData(imgData, 0, 0);
    return true;
  } catch {
    return false;
  }
}

// Mesma recoloração, mas do quadro PARADO numa direção ('south'|'east'|'north'|
// 'west'). Usado pelo palco do Treino Online, onde o boneco precisa encarar o
// dummy à direita. Não aceita addons: estes quadros são só o visual base.
export async function renderOutfitDirectionToCanvas(canvas, { outfitId, gender, direction, colors }) {
  try {
    const [img, tpl] = await Promise.all([
      loadImage(outfitDirPath(outfitId, gender, direction)),
      loadImage(outfitDirTemplatePath(outfitId, gender, direction)),
    ]);
    const imgData = compositeLayers([img]);
    const tplData = compositeLayers([tpl]);
    colorizeInPlace(imgData, tplData, colors || {});
    canvas.width = SIZE;
    canvas.height = SIZE;
    const outCtx = canvas.getContext('2d');
    outCtx.imageSmoothingEnabled = false;
    outCtx.putImageData(imgData, 0, 0);
    return true;
  } catch {
    return false;
  }
}
