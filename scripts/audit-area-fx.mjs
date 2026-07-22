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
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const efeitos = [...document.querySelectorAll('.combat-area-tile')].map(e => {
    const r = e.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  return { criaturas, efeitos };
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

  for (const forma of ['single', 'wave', 'ball', 'square', 'beam', 'explosion']) {
    const { criaturas, efeitos } = await medir(forma);
    if (!criaturas.length) { inconclusivos.push(`forma "${forma}": nenhuma criatura no palco na hora da medição`); continue; }
    if (!efeitos.length) { problemas.push(`forma "${forma}": NENHUM sprite de efeito foi criado`); continue; }

    const alvo = criaturas[0];
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
    // E todo sprite tem que estar em cima de ALGUMA criatura.
    const orfaos = efeitos.filter(e => !criaturas.some(c => cobertura(c, [e]) > 0.3)).length;
    if (orfaos) problemas.push(`forma "${forma}": ${orfaos} sprite(s) de efeito sem criatura embaixo`);
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
