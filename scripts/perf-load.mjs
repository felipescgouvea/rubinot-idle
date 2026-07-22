// MEDIÇÃO DO CARREGAMENTO INICIAL — quantas requisições o jogo faz pra abrir.
//
// Pergunta do Felipe: faz sentido baixar os estáticos de uma vez em vez de
// várias chamadas HTTP? Antes de responder, contar: quantos módulos JS,
// quantas sprites, quanto tempo até a tela ficar utilizável.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

const t0 = Date.now();
await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
const tDom = Date.now() - t0;
await login(page, acct);
const tLogin = Date.now() - t0;
await page.waitForTimeout(6000);

const m = await page.evaluate(() => {
  const r = performance.getEntriesByType('resource');
  const grupos = {};
  for (const e of r) {
    const p = new URL(e.name).pathname;
    let g = 'outros';
    if (/\/src\/.*\.js/.test(p)) g = 'módulos JS';
    else if (/\/assets\/sprites\/monsters\//.test(p)) g = 'sprites de monstro';
    else if (/\/assets\/sprites\/items\//.test(p)) g = 'sprites de item';
    else if (/\/assets\/sprites\//.test(p)) g = 'outras sprites';
    else if (/\.css$/.test(p)) g = 'css';
    else if (/supabase|railway/.test(e.name)) g = 'api';
    grupos[g] = grupos[g] || { n: 0, bytes: 0, ms: 0 };
    grupos[g].n++;
    grupos[g].bytes += e.encodedBodySize || 0;
    grupos[g].ms += e.duration;
  }
  const nav = performance.getEntriesByType('navigation')[0] || {};
  return { grupos, total: r.length, domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0) };
});

console.log(`DOM pronto em ${tDom}ms · logado e jogável em ${tLogin}ms`);
console.log(`\n${m.total} requisições no carregamento:`);
const linhas = Object.entries(m.grupos).sort((a, b) => b[1].n - a[1].n);
for (const [g, d] of linhas) {
  console.log(`  ${g.padEnd(20)} ${String(d.n).padStart(4)}x · ${(d.bytes / 1024).toFixed(0).padStart(5)} KB · ${(d.ms / d.n).toFixed(0).padStart(4)}ms cada`);
}
const js = m.grupos['módulos JS'];
if (js) {
  console.log(`\nSe os ${js.n} módulos JS virassem UM arquivo: ${js.n - 1} requisições a menos`);
  console.log(`(o tempo somado deles hoje é ${(js.ms / 1000).toFixed(1)}s de rede, distribuído em paralelo)`);
}
await browser.close();
