// MEDIÇÃO DE DESEMPENHO durante a caçada.
//
// Queixa do Felipe: "o jogo está bem travado". Antes de otimizar qualquer
// coisa, medir ONDE o tempo vai. Três suspeitos, medidos separadamente:
//
//   1. rede    — quantas requisições/s e quantos bytes o cliente puxa
//   2. main thread — quanto tempo a aba fica BLOQUEADA (long tasks > 50ms):
//                    é isso, e não a rede, que faz a interface travar
//   3. layout  — quantos nós o painel recria por segundo (innerHTML inteiro)
//
// Nada aqui é opinião: os três números saem do próprio navegador
// (PerformanceObserver + Resource Timing).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'rat_cave';
const SEGUNDOS = Number(process.argv[3] || 40);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // Instrumentação: long tasks (thread principal travada) + mutações de DOM.
  await page.evaluate(() => {
    window.__PERF = { longTasks: [], mutacoes: 0, nosAdicionados: 0 };
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) window.__PERF.longTasks.push(Math.round(e.duration));
    }).observe({ entryTypes: ['longtask'] });
    new MutationObserver(muts => {
      window.__PERF.mutacoes += muts.length;
      for (const m of muts) window.__PERF.nosAdicionados += m.addedNodes.length;
    }).observe(document.body, { childList: true, subtree: true });
    performance.clearResourceTimings();
    window.__T0 = performance.now();
  });

  await page.evaluate(async z => {
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
  }, ZONA);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});

  console.log(`medindo ${SEGUNDOS}s de caçada em ${ZONA}...`);
  await page.waitForTimeout(SEGUNDOS * 1000);

  const m = await page.evaluate(() => {
    const dur = (performance.now() - window.__T0) / 1000;
    const req = performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest');
    const porRota = {};
    let bytes = 0, tempoTotal = 0;
    for (const r of req) {
      const rota = r.name.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
      porRota[rota] = porRota[rota] || { n: 0, ms: 0, bytes: 0 };
      porRota[rota].n++;
      porRota[rota].ms += r.duration;
      porRota[rota].bytes += r.transferSize || r.encodedBodySize || 0;
      bytes += r.transferSize || r.encodedBodySize || 0;
      tempoTotal += r.duration;
    }
    const lt = window.__PERF.longTasks;
    return { dur, totalReq: req.length, bytes, tempoTotal, porRota,
             longTasks: lt.length, msTravado: lt.reduce((a, b) => a + b, 0),
             piorTask: lt.length ? Math.max(...lt) : 0,
             mutacoes: window.__PERF.mutacoes, nos: window.__PERF.nosAdicionados };
  });
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });

  const s = m.dur;
  console.log(`\n=== REDE (${s.toFixed(0)}s de caçada) ===`);
  console.log(`  ${m.totalReq} requisições = ${(m.totalReq / s).toFixed(1)}/s · ${(m.bytes / 1024).toFixed(0)} KB = ${(m.bytes / 1024 / s).toFixed(1)} KB/s`);
  Object.entries(m.porRota).sort((a, b) => b[1].n - a[1].n).slice(0, 8).forEach(([rota, d]) => {
    console.log(`    ${rota.padEnd(22)} ${String(d.n).padStart(4)}x · ${(d.ms / d.n).toFixed(0)}ms cada · ${(d.bytes / 1024).toFixed(0)} KB`);
  });

  console.log(`\n=== THREAD PRINCIPAL ===`);
  console.log(`  ${m.longTasks} travadas (>50ms) somando ${m.msTravado}ms = ${(m.msTravado / (s * 10)).toFixed(1)}% do tempo · pior: ${m.piorTask}ms`);

  console.log(`\n=== DOM ===`);
  console.log(`  ${m.mutacoes} mutações = ${(m.mutacoes / s).toFixed(0)}/s · ${m.nos} nós criados = ${(m.nos / s).toFixed(0)}/s`);

  console.log(`\n=== VEREDITO ===`);
  const problemas = [];
  if (m.totalReq / s > 2) problemas.push(`rede: ${(m.totalReq / s).toFixed(1)} req/s é muito — cada uma é uma ida ao Railway`);
  if (m.msTravado / (s * 1000) > 0.1) problemas.push(`thread travada ${(m.msTravado / (s * 10)).toFixed(0)}% do tempo — é isto que o jogador sente como "travado"`);
  if (m.nos / s > 300) problemas.push(`${(m.nos / s).toFixed(0)} nós de DOM criados por segundo — painel sendo recriado inteiro`);
  console.log(problemas.length ? problemas.map(p => '  - ' + p).join('\n') : '  nada acima dos limites');
} catch (e) {
  console.log('EXCEÇÃO', e.message.slice(0, 250));
} finally {
  await browser.close();
}
