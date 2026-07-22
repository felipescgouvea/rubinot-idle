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

  document.querySelectorAll('.combat-area-tile, .combat-area-trail').forEach(e => e.remove());
  bus.emit(bus.EVENTS.COMBAT_FX, { effect: 'fire', shape: forma, targetUid: criaturas[0].uid });
  // A sprite entra com combat-area-pop, que começa em scale(0.6) e só chega a
  // scale(1) aos 25% dos 0,72s. Medir antes disso lê uma caixa MENOR que a
  // real e acusa cobertura baixa — foi o que aconteceu na primeira execução
  // (53% em três formas), e eu quase "consertei" o jogo por causa do relógio
  // do teste. Espera o pop assentar e mede o que o jogador de fato vê.
  await new Promise(r => setTimeout(r, 260));

  const cx = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  // IMPACTO e RASTRO são medidos separado: o rastro fica de propósito no vão
  // entre o boneco e os alvos (é o caminho da magia), então cobrá-lo por
  // "estar em cima de criatura" reprovaria justamente a forma que o Felipe
  // quer de volta.
  const efeitos = [...document.querySelectorAll('.combat-area-tile')].map(cx);
  const rastros = [...document.querySelectorAll('.combat-area-trail')].map(cx);
  const pw = document.getElementById('player-sprite-wrap').getBoundingClientRect();
  // Relê as criaturas AGORA: entre o disparo e a medição o combate segue, e
  // comparar posição nova de efeito com posição velha de criatura mediria a
  // passagem do tempo, não o alinhamento.
  const criaturasAgora = cont ? [...cont.children].map(e => {
    const r = e.getBoundingClientRect();
    return { uid: e.dataset.uid, x: r.left, y: r.top, w: r.width, h: r.height };
  }) : [];
  return { criaturas: criaturasAgora.length ? criaturasAgora : criaturas, efeitos, rastros,
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

  for (const forma of ['single', 'wave', 'ball', 'square', 'beam', 'explosion']) {
    const { criaturas, efeitos, rastros, jogadorY, alvoUid } = await medir(forma);
    if (!criaturas.length) { inconclusivos.push(`forma "${forma}": nenhuma criatura no palco na hora da medição`); continue; }
    if (!efeitos.length) { problemas.push(`forma "${forma}": NENHUM sprite de efeito foi criado`); continue; }

    const alvo = criaturas.find(c => c.uid === alvoUid) || criaturas[0];
    const cobAlvo = cobertura(alvo, efeitos);
    // 60% é folgado de propósito: a sprite é quadrada e a criatura nem sempre,
    // então cobertura total não é atingível. O que se rejeita é o efeito
    // aparecer LONGE — o caso do print, com cobertura perto de zero.
    if (cobAlvo < 0.6) problemas.push(`forma "${forma}": o efeito cobre só ${(cobAlvo * 100).toFixed(0)}% do alvo — sprite fora de cima do bicho`);
    else ok.push(`forma "${forma}": efeito cobre ${(cobAlvo * 100).toFixed(0)}% do alvo`);

    // Área não pode gerar mais sprites que criaturas atingidas — o bug antigo
    // pintava dezenas de tiles no vazio.
    if (efeitos.length > criaturas.length) {
      problemas.push(`forma "${forma}": ${efeitos.length} sprites para ${criaturas.length} criatura(s) — sobra efeito no vazio`);
    }
    // E todo sprite de IMPACTO tem que estar em cima de ALGUMA criatura.
    const orfaos = efeitos.filter(e => !criaturas.some(c => cobertura(c, [e]) > 0.3)).length;
    if (orfaos) problemas.push(`forma "${forma}": ${orfaos} sprite(s) de impacto sem criatura embaixo`);

    // ---- FORMA: onda e feixe precisam ter rastro, e a onda precisa ABRIR ----
    // Este bloco existe por causa de uma regressão minha: ao consertar a
    // colisão eu passei a desenhar só uma bola por bicho, e toda magia ficou
    // igual — "você estragou a wave". Cobertura sozinha não pega isso, porque
    // uma bola por bicho cobre 100%.
    if (forma === 'wave' || forma === 'beam') {
      if (!rastros.length) {
        problemas.push(`forma "${forma}": sem rastro — a magia perdeu a forma e virou só um estouro por criatura`);
      } else {
        const topoAlvos = Math.min(...criaturas.map(c => c.y + c.h / 2));
        const foraDoVao = rastros.filter(r => (r.y + r.h / 2) > jogadorY + 8 || (r.y + r.h / 2) < topoAlvos - 40).length;
        if (foraDoVao) problemas.push(`forma "${forma}": ${foraDoVao} sprite(s) de rastro fora do vão entre o boneco e os alvos`);
        else ok.push(`forma "${forma}": rastro ocupa o vão entre o conjurador e os alvos (${rastros.length} sprites)`);

        if (forma === 'wave') {
          // Cone: a largura perto dos alvos tem que ser MAIOR que perto do
          // conjurador. É exatamente o que distingue uma onda de um feixe.
          const perto = rastros.filter(r => (r.y + r.h / 2) > jogadorY - (jogadorY - topoAlvos) / 2);
          const longe = rastros.filter(r => (r.y + r.h / 2) <= jogadorY - (jogadorY - topoAlvos) / 2);
          const larg = arr => arr.length ? Math.max(...arr.map(r => r.x + r.w)) - Math.min(...arr.map(r => r.x)) : 0;
          if (larg(longe) <= larg(perto)) problemas.push(`forma "wave": o cone NÃO abre (largura perto=${larg(perto).toFixed(0)}px, longe=${larg(longe).toFixed(0)}px) — está parecendo feixe`);
          else ok.push(`forma "wave": o cone abre (${larg(perto).toFixed(0)}px → ${larg(longe).toFixed(0)}px)`);
        }
      }
    }
  }

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
