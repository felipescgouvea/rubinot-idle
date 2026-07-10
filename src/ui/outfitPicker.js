// Tela de aparência, como a do próprio Tibia: escolher gênero e navegar pela
// galeria de outfits reais, comprando os que ainda não tem.
import { G } from '../application/gameStore.js?v=13';
import { OUTFITS } from '../domain/outfits.js?v=13';
import { outfitSpriteFile, spriteUrl } from '../infrastructure/tibiaSprites.js?v=13';
import { on, EVENTS } from '../shared/eventBus.js?v=13';
import { openModal } from './shared.js?v=13';

function outfitCardSprite(outfitId, gender) {
  const file = outfitSpriteFile(outfitId, gender);
  return `<img src="${spriteUrl(file)}" alt="${outfitId}" class="outfit-card-sprite"
    onerror="this.outerHTML='<span class=&quot;outfit-card-sprite-fallback&quot;>❓</span>'" />`;
}

export function renderOutfitPicker() {
  if (!G.vocation) return;
  const gender = G.outfitGender || 'male';

  const html = `
    <h3 style="margin-bottom:10px">👕 Escolher Outfit</h3>
    <div class="outfit-gender-toggle">
      <button class="task-btn ${gender === 'male' ? 'done' : ''}" onclick="setOutfitGender('male')">♂ Masculino</button>
      <button class="task-btn ${gender === 'female' ? 'done' : ''}" onclick="setOutfitGender('female')">♀ Feminino</button>
    </div>
    <div class="outfit-gallery">
      ${OUTFITS.map(o => {
        const owned = o.free || G.outfitsOwned.includes(o.id);
        const wearing = G.outfit === o.id;
        return `<div class="outfit-card ${wearing ? 'wearing' : ''}">
          <div class="outfit-card-sprite-wrap">${outfitCardSprite(o.id, gender)}</div>
          <div class="outfit-card-name">${o.name}</div>
          <div class="outfit-card-price">${o.free ? 'Grátis' : owned ? 'Possui' : `${o.price} 💎 RC`}</div>
          <button class="skill-upgrade-btn" onclick="${owned ? `selectOutfit('${o.id}')` : `buyOutfit('${o.id}')`}">
            ${wearing ? '✅ Vestindo' : owned ? 'Vestir' : 'Comprar'}
          </button>
        </div>`;
      }).join('')}
    </div>
  `;
  openModal(html);
}

export function openOutfitPicker() {
  renderOutfitPicker();
}

export function wireOutfitPickerEvents() {
  on(EVENTS.OUTFIT_PICKER, renderOutfitPicker);
}
