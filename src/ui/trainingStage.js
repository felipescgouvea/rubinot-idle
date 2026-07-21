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
// RESSALVA DA ARTE: os atlases de outfit deste projeto só existem em DUAS
// direções — norte (de costas) e sul (de frente). Não há sprite virado pra
// leste aqui nem nos gifs de outfit da TibiaWiki (que são só a caminhada
// frontal). Por isso o boneco usa a direção SUL nas duas montagens: de frente
// ele ao menos aparece inteiro e reconhecível. Trocar pra um boneco realmente
// virado pra direita depende de garimpar sprites leste das 28 outfits × 2
// gêneros — é um trabalho à parte.
import { G } from '../application/gameStore.js?v=173';
import { outfitWalkAtlasPath, outfitWalkAtlasPathSouth } from '../infrastructure/outfitAssets.js?v=169';
import { buildWalkFrames } from '../infrastructure/outfitWalkRenderer.js?v=169';
import { VOCATION_DEFAULT_OUTFIT } from '../domain/outfits.js?v=169';
import { VOCATIONS } from '../domain/character.js?v=200';
import { ITEMS } from '../domain/items.js?v=184';
import { SPELLS } from '../domain/spells.js?v=171';
import { missileSpriteFile, effectSpriteFile, spriteUrl, TRAINING_DUMMY_FILE } from '../infrastructure/tibiaSprites.js?v=174';

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
  // Sempre a direção SUL: com o alvo à direita, o boneco de costas (norte) daria
  // a impressão de estar atirando pra trás. Ver a ressalva no topo do arquivo —
  // não existe sprite leste no acervo.
  const atlas = outfitWalkAtlasPathSouth(outfitId, gender);

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
