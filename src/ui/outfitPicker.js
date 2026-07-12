// Tela de aparência, como a do próprio Tibia: gênero, galeria de outfits
// reais (comprar/vestir) e, para o outfit atual, os mesmos controles de
// customização do jogo real — 2 addons (toggle) e cor por região (cabeça,
// corpo, pernas, pés) escolhida na paleta oficial de 133 cores — com preview
// ao vivo, recolorido de verdade por região (ver infrastructure/outfitRenderer.js).
import { G } from '../application/gameStore.js?v=85';
import { OUTFITS, VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=85';
import { TIBIA_COLOR_PALETTE } from '../domain/outfitColors.js?v=85';
import { outfitAssetPath } from '../infrastructure/outfitAssets.js?v=85';
import { renderOutfitToCanvas } from '../infrastructure/outfitRenderer.js?v=85';
import { on, EVENTS } from '../shared/eventBus.js?v=85';
import { openModal, rubiniIconImg } from './shared.js?v=85';

// Qual canal de cor está "selecionado" na paleta — estado só de UI, não faz
// parte do save (não é uma decisão de jogo, é só onde o clique da paleta vai).
let activeColorChannel = 'head';

const CHANNEL_LABEL = { head: 'Cabeça', body: 'Corpo', legs: 'Pernas', feet: 'Pés' };

function currentOutfitId() {
  return G.outfit || (G.vocation ? VOCATION_DEFAULT_OUTFIT[G.vocation] : null);
}

function outfitCardSprite(outfitId, gender) {
  const src = outfitAssetPath(outfitId, gender, 1);
  return `<img src="${src}" alt="${outfitId}" class="outfit-card-sprite" style="image-rendering:pixelated"
    onerror="this.outerHTML='<span class=&quot;outfit-card-sprite-fallback&quot;>❓</span>'" />`;
}

function colorChannelButtons(colors) {
  return Object.keys(CHANNEL_LABEL).map(ch => `
    <button class="color-channel-btn ${activeColorChannel === ch ? 'active' : ''}"
      style="background:#${colors[ch]}" onclick="setActiveColorChannel('${ch}')"
      title="${CHANNEL_LABEL[ch]}">${CHANNEL_LABEL[ch]}</button>
  `).join('');
}

function colorPaletteGrid() {
  return `<div class="outfit-color-grid">
    ${TIBIA_COLOR_PALETTE.map(hex => `<button class="color-swatch" style="background:#${hex}" onclick="setOutfitColor('${activeColorChannel}', '${hex}')"></button>`).join('')}
  </div>`;
}

function customizeSection() {
  const outfitId = currentOutfitId();
  if (!outfitId) return '';
  const colors = G.outfitColors;
  return `
    <h3 style="margin-bottom:10px">🎨 Customizar Aparência</h3>
    <div class="outfit-customize-row">
      <div class="outfit-preview-wrap">
        <canvas id="outfit-preview-canvas" width="64" height="64" class="outfit-preview-canvas"></canvas>
      </div>
      <div class="outfit-addon-toggles">
        <label class="outfit-addon-toggle">
          <input type="checkbox" ${G.outfitAddon1 ? 'checked' : ''} onchange="toggleOutfitAddon(1)" /> Addon 1
        </label>
        <label class="outfit-addon-toggle">
          <input type="checkbox" ${G.outfitAddon2 ? 'checked' : ''} onchange="toggleOutfitAddon(2)" /> Addon 2
        </label>
      </div>
    </div>
    <div class="outfit-color-channels">${colorChannelButtons(colors)}</div>
    ${colorPaletteGrid()}
  `;
}

function mountPreviewCanvas() {
  const canvas = document.getElementById('outfit-preview-canvas');
  const outfitId = currentOutfitId();
  if (!canvas || !outfitId) return;
  renderOutfitToCanvas(canvas, {
    outfitId,
    gender: G.outfitGender || 'male',
    addon1: G.outfitAddon1,
    addon2: G.outfitAddon2,
    colors: G.outfitColors,
  }).then(ok => {
    if (!ok) canvas.replaceWith(Object.assign(document.createElement('span'), { className: 'outfit-preview-fallback', textContent: '❓' }));
  });
}

export function renderOutfitPicker() {
  if (!G.vocation) return;
  const gender = G.outfitGender || 'male';

  const html = `
    <div class="outfit-gender-toggle">
      <button class="task-btn ${gender === 'male' ? 'done' : ''}" onclick="setOutfitGender('male')">♂ Masculino</button>
      <button class="task-btn ${gender === 'female' ? 'done' : ''}" onclick="setOutfitGender('female')">♀ Feminino</button>
    </div>
    <div class="outfit-picker-layout">
      <div class="outfit-picker-col">
        ${customizeSection()}
      </div>
      <div class="outfit-picker-col">
        <h3 style="margin-bottom:10px">👕 Escolher Outfit</h3>
        <div class="outfit-gallery">
          ${OUTFITS.map(o => {
            const owned = o.free || G.outfitsOwned.includes(o.id);
            const wearing = G.outfit === o.id;
            return `<div class="outfit-card ${wearing ? 'wearing' : ''}">
              <div class="outfit-card-sprite-wrap">${outfitCardSprite(o.id, gender)}</div>
              <div class="outfit-card-name">${o.name}</div>
              <div class="outfit-card-price">${o.free ? 'Grátis' : owned ? 'Possui' : `${o.price} ${rubiniIconImg('inline-icon')} RC`}</div>
              <button class="skill-upgrade-btn" onclick="${owned ? `selectOutfit('${o.id}')` : `buyOutfit('${o.id}')`}">
                ${wearing ? '✅ Vestindo' : owned ? 'Vestir' : 'Comprar'}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  openModal(html);
  mountPreviewCanvas();
}

export function openOutfitPicker() {
  renderOutfitPicker();
}

export function setActiveColorChannel(channel) {
  if (!CHANNEL_LABEL[channel]) return;
  activeColorChannel = channel;
  renderOutfitPicker();
}

export function wireOutfitPickerEvents() {
  on(EVENTS.OUTFIT_PICKER, renderOutfitPicker);
}
