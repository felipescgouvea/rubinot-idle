import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
const errs = new Set();
p.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 200)));
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('#auth-email', { timeout: 30000 });
await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
await p.click('#auth-submit'); await p.waitForTimeout(8000);
// dá gold pro slider ter alcance e força o painel visível
await p.evaluate(() => {
  const el = document.getElementById('shop-content');
  if (el) { let n = el; while (n && n !== document.body) { n.style.display = 'block'; n.style.visibility = 'visible'; n = n.parentElement; } }
});
for (const [key, file] of [['magic', 'shop-magic.png'], ['equipment', 'shop-equip.png']]) {
  await p.evaluate(k => window.setShopTab && window.setShopTab(k), key);
  await p.waitForTimeout(900);
  console.log(key, JSON.stringify(await p.evaluate(() => {
    const w = document.querySelector('.trade-window');
    if (!w) return 'SEM JANELA';
    return { linhas: w.querySelectorAll('.trade-row').length, selecionadas: w.querySelectorAll('.trade-row.selected').length,
             botoesComprar: w.querySelectorAll('.trade-buy-btn').length, sliders: w.querySelectorAll('.shop-qty-range').length };
  })));
  const el = await p.$('#shop-content');
  if (el) await el.screenshot({ path: 'scripts/' + file }).catch(e => console.log('print falhou', e.message.slice(0, 60)));
}
console.log('erros:', [...errs].join(' | ') || 'nenhum');
await b.close();
