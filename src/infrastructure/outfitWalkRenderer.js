// Renderiza a ANIMAÇÃO DE CAMINHADA do outfit COM as cores escolhidas pelo
// jogador. Porta a mesma ideia do Outfitter da TibiaWiki: cada outfit tem um
// atlas (Outfitter_<looktype>.png) com, por direção, o sprite base + uma
// máscara "template" onde amarelo=cabeça, vermelho=corpo, verde=pernas,
// azul=pés. Recolorimos multiplicando cada região pela cor do canal e
// animamos os 8 quadros de movimento.
//
// Os atlases foram recortados só na direção frontal (colunas base+template =
// x 0..128) e self-hostados em assets/outfits-walk/ — ver dl no histórico.
// Layout (idêntico ao Outfitter): célula 64x64; base em x=0, template em x=64;
// cada "quadro" ocupa ADD linhas (base/addon1/addon2 × sentado/em pé); os 8
// quadros de movimento ficam nas linhas (jo+IDLE_LEN)*ADD.
const CELL = 64;
const ADD = 6;          // (sits?2:1) * (1 + addons) = 2 * 3
const IDLE_LEN = 1;     // outfits têm 1 quadro idle
const MOVE_FRAMES = 8;
const X_BASE = 0, X_TPL = CELL;

const atlasCache = new Map();

function loadImage(src) {
  if (atlasCache.has(src)) return atlasCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('atlas ' + src));
    img.src = src;
  });
  atlasCache.set(src, p);
  return p;
}

function hexToRgb(hex) {
  const h = String(hex || 'FFFFFF').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Recolore os pixels de `base` (ImageData) usando a máscara `tpl` e as cores
// por região — mesma detecção de cor do Outfitter (thresholds 240/15).
function colorizeFrame(base, tpl, colors) {
  const px = base.data, t = tpl.data;
  const head = hexToRgb(colors.head), body = hexToRgb(colors.body);
  const legs = hexToRgb(colors.legs), feet = hexToRgb(colors.feet);
  for (let i = 0; i < px.length; i += 4) {
    if (t[i + 3] === 0) continue;
    const r = t[i], g = t[i + 1], b = t[i + 2];
    let c = null;
    if (r >= 240 && g >= 240 && b <= 15) c = head;
    else if (r >= 240 && g <= 15 && b <= 15) c = body;
    else if (r <= 15 && g >= 240 && b <= 15) c = legs;
    else if (r <= 15 && g <= 15 && b >= 240) c = feet;
    if (!c) continue;
    px[i] = (px[i] * c[0] / 255) | 0;
    px[i + 1] = (px[i + 1] * c[1] / 255) | 0;
    px[i + 2] = (px[i + 2] * c[2] / 255) | 0;
  }
}

// Gera o quadro parado (idle) + os 8 quadros da caminhada recolorida. Retorna
// { idle:null, frames:[] } se o atlas falhar (quem chama cai no fallback).
export async function buildWalkFrames(atlasSrc, { colors, addon1, addon2 } = {}) {
  let atlas;
  try { atlas = await loadImage(atlasSrc); } catch { return { idle: null, frames: [] }; }

  const off = document.createElement('canvas');
  off.width = atlas.width; off.height = atlas.height;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.imageSmoothingEnabled = false;
  octx.drawImage(atlas, 0, 0);

  // Monta um quadro (canvas 64x64) recolorido a partir da linha-base `yo`,
  // compondo os overlays de addon (linhas yo+1 / yo+2).
  const buildFrame = (yo) => {
    const fc = document.createElement('canvas');
    fc.width = CELL; fc.height = CELL;
    const fctx = fc.getContext('2d');
    fctx.imageSmoothingEnabled = false;
    const drawLayer = (rowOffset) => {
      const y = (yo + rowOffset) * CELL;
      if (y + CELL > off.height) return;
      const base = octx.getImageData(X_BASE, y, CELL, CELL);
      const tpl = octx.getImageData(X_TPL, y, CELL, CELL);
      colorizeFrame(base, tpl, colors || {});
      // compõe SOBRE o quadro (putImageData sobrescreveria o alpha) via canvas temp
      const tmp = document.createElement('canvas');
      tmp.width = CELL; tmp.height = CELL;
      tmp.getContext('2d').putImageData(base, 0, 0);
      fctx.drawImage(tmp, 0, 0);
    };
    drawLayer(0);              // base (sem addon)
    if (addon1) drawLayer(1);  // overlay do addon 1
    if (addon2) drawLayer(2);  // overlay do addon 2
    return fc;
  };

  const idle = buildFrame(0); // linha 0 = quadro parado
  const frames = [];
  for (let jo = 0; jo < MOVE_FRAMES; jo++) frames.push(buildFrame((jo + IDLE_LEN) * ADD));
  return { idle, frames };
}
