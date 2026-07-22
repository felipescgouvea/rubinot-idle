// AUDITORIA DO EFEITO DE ÁREA — a sprite cobre MESMO quem apanha?
//
// A queixa do Felipe (print): magia de área desenhava um bloco de fogo no meio
// do vazio enquanto o monstro que tomou dano ficava intocado, vários tiles
// acima. O efeito seguia um tabuleiro de tiles ao redor do boneco, e este
// palco não é um tabuleiro: as criaturas ficam numa fileira no alto.
//
// O teste é geométrico, não "apareceu alguma coisa": mede a SOBREPOSIÇÃO entre
// a caixa de cada sprite de efeito e a caixa da criatura atingida. Uma sprite
// bonita no lugar errado passa num teste de presença e falha neste.
//
// Uso: node scripts/audit-area-fx.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], inconclusivos = [], ok = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// Dispara o efeito direto pelo barramento e mede a geometria no mesmo quadro.
const medir = (shape) => page.evaluate(async (forma) => {
  const bus = await window.__liveImport('eventBus.js');
  const cont = document.getElementById('stage-pack');
  const criaturas = cont ? [...cont.children].map(e => {
    const r = e.getBoundingClientRect();
    return { uid: e.dataset.uid, x: r.left, y: r.top, w: r.width, h: r.height };
  }) : [];
  if (!criaturas.length) return { criaturas: [], efeitos: [] };

  document.querySelectorAll('.combat-area-tile').forEach(e => e.remove());
  bus.emit(bus.EVENTS.COMBAT_FX, { effect: 'fire', shape: forma, targetUid: criaturas[0].uid });
  // A sprite entra com combat-area-pop, que começa em scale(0.6) e só chega a
  // scale(1) aos 25% dos 0,72s. Medir antes disso lê uma caixa MENOR que a
  // real e acusa cobertura baixa — foi o que aconteceu na primeira execução
  // (53% em três formas), e eu quase "consertei" o jogo por causa do relógio
  // do teste. Espera o pop assentar e mede o que o jogador de fato vê.
  await new Promise(r => setTimeout(r, 260));

  const cx = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const efeitos = [...document.querySelectorAll('.combat-area-tile')].map(cx);
  const pw = document.getElementById('player-sprite-wrap').getBoundingClientRect();
  // Relê as criaturas AGORA: entre o disparo e a medição o combate segue, e
  // comparar posição nova de efeito com posição velha de criatura mediria a
  // passagem do tempo, não o alinhamento.
  const criaturasAgora = cont ? [...cont.children].map(e => {
    const r = e.getBoundingClientRect();
    return { uid: e.dataset.uid, x: r.left, y: r.top, w: r.width, h: r.height };
  }) : [];
  return { criaturas: criaturasAgora.length ? criaturasAgora : criaturas, efeitos,
           jogadorY: pw.top + pw.height / 2, alvoUid: criaturas[0].uid };
}, shape);

// Fração da criatura coberta por ALGUM sprite de efeito.
function cobertura(c, efeitos) {
  const areaC = c.w * c.h;
  if (!areaC) return 0;
  let melhor = 0;
  for (const e of efeitos) {
    const ix = Math.max(0, Math.min(c.x + c.w, e.x + e.w) - Math.max(c.x, e.x));
    const iy = Math.max(0, Math.min(c.y + c.h, e.y + e.h) - Math.max(c.y, e.y));
    melhor = Math.max(melhor, (ix * iy) / areaC);
  }
  return melhor;
}

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);

  const pronto = await page.evaluate(() => !!window.__G.vocation);
  if (!pronto) { inconclusivos.push('conta sem personagem — não dá pra entrar em combate'); throw new Error('sem personagem');}

  await page.evaluate(() => window.openBattleModal && window.openBattleModal());
  await page.evaluate(async () => { window.__H.selectZone('troll_cave'); await new Promise(r => setTimeout(r, 700)); await window.__H.startHunt(); });
  await page.waitForFunction(() => {
    const c = document.getElementById('stage-pack');
    return c && c.children.length > 0;
  }, null, { timeout: 40000 }).catch(() => {});

  // Espera o palco ASSENTAR antes de medir. As criaturas entram animando de
  // baixo pra cima (ver huntPanel: renderStagePack); medir nesse meio-tempo
  // compara efeito fixado na posição do disparo com criatura que ainda estava
  // andando — foi assim que "single", a primeira forma medida, deu 19% num
  // efeito que está correto. A espera é uma PRÉ-CONDIÇÃO do teste, não uma
  // folga no critério: o limiar segue em 60%.
  const assentou = await page.waitForFunction(() => {
    const c = document.getElementById('stage-pack');
    if (!c || !c.children.length) return false;
    const agora = [...c.children].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join('|');
    const igual = window.__posAnterior === agora;
    window.__posAnterior = agora;
    return igual;
  }, null, { timeout: 20000, polling: 400 }).then(() => true).catch(() => false);
  if (!assentou) inconclusivos.push('o palco não parou de se mexer em 20s — medições podem estar pegando criatura em movimento');

  // Silencia as magias do PRÓPRIO jogo antes de medir. O personagem continua
  // caçando (é o que mantém as criaturas no palco), e cada magia que ele lança
  // cria os mesmos .combat-area-tile que eu injeto — misturando as duas coisas.
  // Foi isso que produziu números impossíveis: "beam com 224px de largura"
  // quando todos os tiles do feixe estão na mesma coluna, e contagens que não
  // batiam com a forma. Eu quase reportei bug no renderizador por causa disso.
  await page.evaluate(async () => {
    const rtc = await window.__liveImport('rtcUseCases.js');
    for (let i = 0; i < 4; i++) rtc.clearRtcAttackSpellSlot(i);
  });
  await page.waitForTimeout(1200);

  for (const forma of ['single', 'wave', 'ball', 'square', 'beam', 'explosion']) {
    const { criaturas, efeitos, jogadorY, alvoUid } = await medir(forma);
    if (!criaturas.length) { inconclusivos.push(`forma "${forma}": nenhuma criatura no palco na hora da medição`); continue; }
    if (!efeitos.length) { problemas.push(`forma "${forma}": NENHUM sprite de efeito foi criado`); continue; }

    const alvo = criaturas.find(c => c.uid === alvoUid) || criaturas[0];
    const cobAlvo = cobertura(alvo, efeitos);
    // 60% é folgado de propósito: a sprite é quadrada e a criatura nem sempre,
    // então cobertura total não é atingível. O que se rejeita é o efeito
    // aparecer LONGE — o caso do print, com cobertura perto de zero.
    if (cobAlvo < 0.6) problemas.push(`forma "${forma}": o efeito cobre só ${(cobAlvo * 100).toFixed(0)}% do alvo — sprite fora de cima do bicho`);
    else ok.push(`forma "${forma}": efeito cobre ${(cobAlvo * 100).toFixed(0)}% do alvo`);

    // NÃO se cobra "todo sprite em cima de criatura": a forma da área ocupa
    // legitimamente o vão entre o conjurador e os alvos — é assim que ela é
    // desenhada no Tibia e é a estrutura que o Felipe quer preservada. O que se
    // cobra é que ela CHEGUE nos bichos.
    if (forma !== 'single') {
      const topoAlvos = Math.min(...criaturas.map(c => c.y + c.h / 2));
      const maisLonge = Math.min(...efeitos.map(e => e.y + e.h / 2));
      const sobra = maisLonge - topoAlvos;   // >0 = o desenho parou antes
      if (sobra > 40) problemas.push(`forma "${forma}": o desenho para ${sobra.toFixed(0)}px ANTES da fileira — não alcança as criaturas`);
      else ok.push(`forma "${forma}": o desenho alcança a fileira (${efeitos.length} tiles)`);

      // A onda tem que ABRIR e o feixe tem que seguir reto — é o que distingue
      // as duas, e foi o que eu apaguei ao trocar a estrutura por conta própria.
      if (forma === 'wave' || forma === 'beam') {
        const meio = (jogadorY + topoAlvos) / 2;
        const larg = arr => arr.length ? Math.max(...arr.map(r => r.x + r.w)) - Math.min(...arr.map(r => r.x)) : 0;
        const perto = larg(efeitos.filter(e => (e.y + e.h / 2) > meio));
        const longe = larg(efeitos.filter(e => (e.y + e.h / 2) <= meio));
        if (forma === 'wave') {
          if (longe <= perto) problemas.push(`forma "wave": o cone NÃO abre (perto=${perto.toFixed(0)}px, longe=${longe.toFixed(0)}px) — está parecendo feixe`);
          else ok.push(`forma "wave": o cone abre (${perto.toFixed(0)}px → ${longe.toFixed(0)}px)`);
        } else if (longe > perto * 1.5) {
          problemas.push(`forma "beam": o feixe está ABRINDO como onda (perto=${perto.toFixed(0)}px, longe=${longe.toFixed(0)}px)`);
        } else ok.push('forma "beam": segue reto, sem abrir');
      }
    }
  }

  // Print da onda pra conferência visual — o problema aqui é de aparência, e
  // número nenhum substitui olhar.
  // Pega o elemento ANTES de disparar: obter o handle e capturar leva tempo, e
  // o efeito dura 0,72s — na primeira tentativa o print saiu vazio porque a
  // captura só aconteceu depois de tudo ter sumido.
  const palco = await page.$('#dungeon-stage');
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    const c = document.getElementById('stage-pack');
    document.querySelectorAll('.combat-area-tile').forEach(e => e.remove());
    bus.emit(bus.EVENTS.COMBAT_FX, { effect: 'fire', shape: 'wave', targetUid: c.children[0].dataset.uid });
  });
  await page.waitForTimeout(200);
  // SEM animations:'disabled' — essa flag avança a animação pro estado FINAL, e
  // o keyframe final do efeito é opacity:0 (ele some). O print saía vazio com o
  // efeito funcionando perfeitamente na tela.
  if (palco) await palco.screenshot({ path: 'scripts/shot-wave.png' });

  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });

} catch (e) {
  if (!/sem personagem/.test(e.message || '')) problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(66));
console.log('AUDITORIA DO EFEITO DE ÁREA (a sprite cobre quem apanha?)');
console.log('='.repeat(66));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  problemas.forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else if (inconclusivos.length) {
  console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas nem tudo foi exercitado');
  process.exitCode = 2;
} else {
  console.log('\nRESULTADO: PASSOU — o efeito de área cai em cima das criaturas atingidas');
}
