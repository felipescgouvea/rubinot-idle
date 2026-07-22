import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = new Set();
p.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.add('CONSOLE ' + m.text().slice(0, 200)); });
p.on('response', r => { if (r.status() === 404) errs.add('404 ' + r.url().split('/').slice(-2).join('/')); });
try {
  await p.goto(acct.site + '?cb=' + process.argv[2], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('#auth-email', { timeout: 30000 });
  await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
  await p.click('#auth-submit'); await p.waitForTimeout(8000);
  console.log('versao main.js:', await p.evaluate(() => {
    const s = [...document.querySelectorAll('script')].map(x => x.src).find(x => x.includes('main.js'));
    return s ? s.split('?')[1] : '?';
  }));
  // abre a aba Loja e tira print das duas lojas de NPC
  for (const [tab, shopKey, file] of [['shop', 'magic', 'shop-magic.png'], ['shop', 'equipment', 'shop-equip.png']]) {
    await p.evaluate(t => window.showTab && window.showTab(t), tab);
    await p.waitForTimeout(1200);
    await p.evaluate(k => window.setShopTab && window.setShopTab(k), shopKey);
    await p.waitForTimeout(1200);
    const el = await p.$('#shop-content');
    if (el) await el.screenshot({ path: 'scripts/' + file });
    const info = await p.evaluate(() => {
      const w = document.querySelector('.trade-window');
      return w ? { linhas: w.querySelectorAll('.trade-row').length, botoes: w.querySelectorAll('.trade-buy-btn').length, sliders: w.querySelectorAll('.shop-qty-range').length } : 'SEM JANELA DE TRADE';
    });
    console.log(shopKey, JSON.stringify(info));
  }
} catch (e) { console.log('EX', e.message); }
finally { console.log('--- erros ---'); [...errs].slice(0, 20).forEach(e => console.log(' ', e)); await b.close(); }
