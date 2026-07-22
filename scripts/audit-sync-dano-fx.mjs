// SINCRONIA entre o SPRITE da magia e a QUEDA DE VIDA que ela causa.
//
// O jogo já sincroniza o golpe BÁSICO: a barra só cai quando o projétil termina
// de voar (pendingHits + COMBAT_PROJECTILE_LANDED). Magia de ÁREA não entra
// nesse pareamento — o efeito é desenhado na hora do cast (previsão do cliente)
// e a queda de vida vem pelo relógio do golpe básico. Enquanto o efeito
// aparecia longe do bicho ninguém comparava os dois; agora que ele cai em cima,
// a defasagem ficou visível.
//
// Mede, para cada aparição de efeito de área, quanto tempo depois a vida do
// alvo muda. Uso: node scripts/audit-sync-dano-fx.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const problemas = [], ok = [], inconclusivos = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => window.openBattleModal && window.openBattleModal());

  // Garante uma magia de ÁREA no RTC, senão não há o que medir.
  const armado = await page.evaluate(async () => {
    const { SPELLS } = await window.__liveImport('spells.js');
    const rtc = await window.__liveImport('rtcUseCases.js');
    const G = window.__G;
    const area = Object.entries(SPELLS).find(([, s]) =>
      s.voc.includes(G.vocation) && s.level <= G.level && s.type === 'attack' && s.area && s.area !== 'single');
    const alvo = area || Object.entries(SPELLS).find(([, s]) => s.voc.includes(G.vocation) && s.level <= G.level && s.type === 'attack');
    if (alvo) rtc.setRtcAttackSpellSlot(0, alvo[0], 'spell');
    return alvo ? { id: alvo[0], area: alvo[1].area } : null;
  });
  console.log('magia armada:', JSON.stringify(armado));
  if (!armado) { inconclusivos.push('personagem sem magia de ataque — nada a medir'); throw new Error('sem magia'); }

  // Instrumenta: marca quando um efeito de área nasce e quando a vida do alvo muda.
  await page.evaluate(() => {
    window.__sync = { fx: [], hp: [] };
    const bl = document.getElementById('battle-list');
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.classList && n.classList.contains('combat-area-tile') && !window.__fxAberto) {
            window.__fxAberto = true;
            window.__sync.fx.push(performance.now());
            setTimeout(() => { window.__fxAberto = false; }, 400);
          }
        }
      }
    }).observe(document.getElementById('dungeon-stage'), { childList: true });
    new MutationObserver(() => window.__sync.hp.push(performance.now()))
      .observe(bl, { childList: true, subtree: true, characterData: true });
  });

  await page.evaluate(async () => { window.__H.selectZone('troll_cave'); await new Promise(r => setTimeout(r, 700)); await window.__H.startHunt(); });
  await page.waitForTimeout(45000);

  const d = await page.evaluate(() => window.__sync);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });

  if (d.fx.length < 3) { inconclusivos.push(`só ${d.fx.length} efeito(s) de área em 45s — amostra pequena demais`); }
  else {
    // Para cada efeito, o primeiro movimento de vida DEPOIS dele.
    const atrasos = [];
    for (const t of d.fx) {
      const prox = d.hp.find(h => h > t);
      if (prox != null) atrasos.push(prox - t);
    }
    atrasos.sort((a, b) => a - b);
    const mediana = atrasos[Math.floor(atrasos.length / 2)];
    const pior = atrasos[atrasos.length - 1];
    console.log(`efeitos: ${d.fx.length} · mudanças de vida: ${d.hp.length}`);
    console.log(`atraso efeito→vida: mediana ${mediana.toFixed(0)}ms · pior ${pior.toFixed(0)}ms`);
    // O golpe básico já é pareado com o pouso do projétil; a referência é essa.
    // Acima de 400ms o jogador vê o fogo e SÓ DEPOIS a vida cair.
    if (mediana > 400) problemas.push(`o dano chega ${mediana.toFixed(0)}ms depois do sprite (mediana) — fogo e queda de vida em relógios diferentes`);
    else ok.push(`dano acompanha o sprite (mediana ${mediana.toFixed(0)}ms)`);
  }
} catch (e) {
  if (!/sem magia/.test(e.message || '')) problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally { await browser.close(); }

console.log('\n' + '='.repeat(60));
console.log('SINCRONIA SPRITE x DANO (magia de área)');
console.log('='.repeat(60));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) { console.log(`\nRESULTADO: FALHOU — ${problemas.length}`); problemas.forEach(p => console.log('  ✗ ' + p)); process.exitCode = 1; }
else if (inconclusivos.length) { console.log('\nRESULTADO: INCONCLUSIVO'); process.exitCode = 2; }
else console.log('\nRESULTADO: PASSOU');
