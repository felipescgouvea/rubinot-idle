// Palco do Treino Online — a mesma linguagem visual da cena de batalha, em vez
// de um ícone parado com uma flecha passando por cima (o que era, e o Felipe
// reprovou).
//
// Duas montagens, conforme a vocação:
//
//  • Arma (Knight / Paladino): boneco à ESQUERDA, dummy à DIREITA, e o projétil
//    saindo do boneco em direção ao dummy. No corpo a corpo não há projétil: o
//    boneco avança e o dummy leva o baque.
//
//  • Mago: SEM dummy. Só o boneco, virado pra baixo (de frente), lançando a
//    magia escolhida — o efeito real da magia estoura em volta dele.
//
// O boneco encara o alvo de verdade: as sprites das QUATRO direções foram
// trazidas pro projeto (assets/outfits-dir/, ver
// scripts/fetch_outfit_directions.py), então aqui ele usa LESTE quando bate no
// dummy à direita e SUL quando é o mago lançando magia de frente.
import { G } from '../application/gameStore.js?v=197';
import { renderOutfitDirectionToCanvas } from '../infrastructure/outfitRenderer.js?v=193';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=193';
import { VOCATIONS } from '../domain/character.js?v=224';
import { ITEMS } from '../domain/items.js?v=208';
import { SPELLS } from '../domain/spells.js?v=195';
import { missileSpriteFile, effectSpriteFile, spriteUrl, TRAINING_DUMMY_FILE } from '../infrastructure/tibiaSprites.js?v=198';

// Mesmo critério do retrato/cena de batalha: outfit escolhido, ou o padrão da
// vocação.
function currentOutfitId() {
  return G.outfit || (G.vocation ? VOCATION_DEFAULT_OUTFIT[G.vocation] : null);
}

// Projétil certo pro que está sendo treinado. Melee não tem: o golpe é no
// corpo a corpo, o baque no dummy já conta a história.
function missileFor(skillId, spell) {
  if (skillId === 'distance') {
    const arma = G.equipment && G.equipment.weapon ? ITEMS[G.equipment.weapon] : null;
    return arma && /crossbow/i.test(arma.name || '') ? 'bolt' : 'arrow';
  }
  if (skillId === 'magic') {
    // 'physical' não tem míssil próprio: as magias físicas do Paladino são de
    // arremesso (Ethereal Spear), então a lança é o projétil certo.
    const el = (spell && spell.element) || 'energy';
    return el === 'physical' ? 'spear' : el;
  }
  return null;
}

// HTML do palco. `skillId` decide a montagem; `spell` só importa pro mago.
export function trainingStageHtml(skillId, spell) {
  const semDummy = skillId === 'magic';
  const missile = semDummy ? null : missileFor(skillId, spell);
  const missileFile = missile ? missileSpriteFile(missile) : null;
  // Magia de cura não tem elemento (agora ela também treina ML — ver
  // ui/trainingPanel.js), então cai no brilho 'holy', que é o mais próximo do
  // efeito de cura do Tibia. Sem isso o palco do mago ficava sem animação
  // nenhuma quando a magia escolhida era de cura.
  const efeito = semDummy && spell ? effectSpriteFile(spell.element || 'holy') : null;

  const dummy = semDummy ? '' : `
    <div class="tstage-dummy">
      <img src="${spriteUrl(TRAINING_DUMMY_FILE)}" alt="" aria-hidden="true" />
    </div>`;
  const projetil = missileFile ? `<img class="tstage-missile" src="${spriteUrl(missileFile)}" alt="" aria-hidden="true" />` : '';
  const magia = efeito ? `<img class="tstage-cast" src="${spriteUrl(efeito)}" alt="" aria-hidden="true" />` : '';

  return `
    <div class="training-stage ${semDummy ? 'tstage-mage' : 'tstage-melee'}" data-tskill="${skillId}">
      ${dummy}
      ${projetil}
      <div class="tstage-player">
        ${magia}
        <span class="tstage-player-fallback">${G.vocation ? VOCATIONS[G.vocation].icon : '🧑'}</span>
      </div>
    </div>`;
}

// Desenha o boneco recolorido no palco (o HTML acima só reserva o lugar, com um
// emoji de fallback pra quem não tem outfit ou se o atlas falhar).
export function mountTrainingStagePlayer(skillId) {
  const wrap = document.querySelector('.training-stage .tstage-player');
  if (!wrap) return;
  const outfitId = currentOutfitId();
  if (!outfitId) return;                       // fica o emoji de fallback
  // Mago fica de frente lançando a magia; quem treina arma encara o dummy, que
  // está à DIREITA — daí a direção leste.
  const direction = skillId === 'magic' ? 'south' : 'east';
  const canvas = document.createElement('canvas');
  canvas.className = 'tstage-player-canvas';
  renderOutfitDirectionToCanvas(canvas, {
    outfitId,
    gender: G.outfitGender || 'male',
    direction,
    colors: G.outfitColors,
  }).then(ok => {
    if (!ok || !wrap.isConnected) return;      // falhou: mantém o emoji
    const fb = wrap.querySelector('.tstage-player-fallback');
    if (fb) fb.remove();
    wrap.insertBefore(canvas, wrap.firstChild);
  });
}
