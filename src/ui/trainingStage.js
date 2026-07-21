// Palco do Treino Online — a mesma linguagem visual da cena de batalha, em vez
// de um ícone parado com uma flecha passando por cima (o que era, e o Felipe
// reprovou).
//
// Duas montagens, conforme a vocação:
//
//  • Arma (Knight / Paladino): o boneco fica na base do palco e o DUMMY fica à
//    frente dele, no topo — exatamente a disposição da cena de batalha, onde as
//    criaturas nascem em cima e o boneco embaixo as encara. O projétil sai do
//    boneco e vai até o dummy; no corpo a corpo não há projétil, só o baque.
//
//  • Mago: SEM dummy. Só o boneco, virado pra baixo (de frente), lançando a
//    magia escolhida — o efeito real da magia estoura em volta dele.
//
// Por que "à frente" e não "à direita": os atlases de outfit só existem em DUAS
// direções, norte (de costas) e sul (de frente). Não há sprite virado pra leste
// em lugar nenhum do projeto nem na wiki, então um boneco de frente atirando pro
// lado ficaria olhando pra câmera enquanto acerta algo fora do seu campo de
// visão. Encarando o alvo, a cena lê certo com as sprites que existem.
import { G } from '../application/gameStore.js?v=171';
import { outfitWalkAtlasPath, outfitWalkAtlasPathSouth } from '../infrastructure/outfitAssets.js?v=167';
import { buildWalkFrames } from '../infrastructure/outfitWalkRenderer.js?v=167';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=167';
import { VOCATIONS } from '../domain/character.js?v=198';
import { ITEMS } from '../domain/items.js?v=182';
import { SPELLS } from '../domain/spells.js?v=169';
import { missileSpriteFile, effectSpriteFile, spriteUrl, TRAINING_DUMMY_FILE } from '../infrastructure/tibiaSprites.js?v=172';

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
  const efeito = semDummy && spell ? effectSpriteFile(spell.element) : null;

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
  const gender = G.outfitGender || 'male';
  // Mago encara a câmera (sul); quem bate no dummy encara o dummy (norte).
  const atlas = skillId === 'magic'
    ? outfitWalkAtlasPathSouth(outfitId, gender)
    : outfitWalkAtlasPath(outfitId, gender);

  buildWalkFrames(atlas, {
    colors: G.outfitColors,
    addon1: G.outfitAddon1,
    addon2: G.outfitAddon2,
  }).then(({ idle, frames }) => {
    const base = idle || frames[0];
    if (!base || !wrap.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    canvas.className = 'tstage-player-canvas';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0);
    const fb = wrap.querySelector('.tstage-player-fallback');
    if (fb) fb.remove();
    wrap.insertBefore(canvas, wrap.firstChild);
  }).catch(() => {});
}
