// Passo de caminhada do palco de batalha — fonte ÚNICA de verdade pro
// deslocamento do cenário E pros quadros do boneco, pra que os dois andem
// juntos e parem juntos.
//
// Dois bugs que este módulo resolve:
//
// 1. "cenário mudando quando aparece monstro" — antes a rolagem era uma
//    @keyframes ligada pela classe .searching. Ao tirar a classe o browser
//    descarta a animação e o background-position VOLTA A ZERO, ou seja, a cena
//    saltava pra outro trecho da imagem no instante em que a criatura brotava.
//    Aqui a distância percorrida é um acumulador que NUNCA reseta: quando para,
//    a cena simplesmente congela onde estava.
//
// 2. "tem que finalizar o passo que estava dando" — parar no meio da passada
//    deixava o boneco com a perna no ar e a cena num offset quebrado. Agora o
//    pedido de parada só marca um ALVO no próximo múltiplo de um tile; o loop
//    continua até fechar a passada e só então congela.
//
// A cena tem 1024px de altura e é periódica em Y (ver scripts/cavegen.py), por
// isso o offset aplicado é `dist % 1024` — a volta é invisível.

const STEP_PX = 32;    // um tile do Tibia = uma passada
const STEP_MS = 480;   // ~2 tiles por segundo
const SCENE_H = 1024;  // altura da cena gerada (periódica em Y)

let dist = 0;          // px acumulados; nunca reseta
let want = false;      // se DEVERIA estar andando
let moving = false;    // se ainda está andando (inclui a passada de fechamento)
let stopAt = Infinity; // distância em que a passada atual fecha
let raf = 0;
let last = 0;

// Fase dentro da passada atual (0..1) — o boneco usa pra escolher o quadro.
export function stageWalkPhase() { return (dist % STEP_PX) / STEP_PX; }
// Se ainda está em movimento (true também durante a passada de fechamento).
export function isStageWalking() { return moving; }

export function setStageWalking(on) {
  if (on === want) return;
  want = on;
  if (on) {
    stopAt = Infinity;
    moving = true;
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  } else {
    // fecha a passada em curso antes de congelar
    stopAt = (Math.floor(dist / STEP_PX) + 1) * STEP_PX;
  }
}

function applyOffset() {
  const stage = document.getElementById('dungeon-stage');
  if (stage) stage.style.setProperty('--scene-y', (dist % SCENE_H) + 'px');
}

function tick(ts) {
  if (!last) { last = ts; raf = requestAnimationFrame(tick); return; }
  // dt limitado: se a aba ficou em segundo plano, não teleporta a cena
  const dt = Math.min(120, ts - last);
  last = ts;
  dist += (dt / STEP_MS) * STEP_PX;
  if (dist >= stopAt) { dist = stopAt; moving = false; }
  applyOffset();
  if (moving) raf = requestAnimationFrame(tick);
  else { raf = 0; last = 0; }
}
