import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1000, height: 820 } });
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('#auth-email', { timeout: 30000 });
await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
await p.click('#auth-submit'); await p.waitForTimeout(8000);
await p.evaluate(() => {
  let n = document.getElementById('shop-content');
  while (n && n !== document.body) { n.style.display = 'block'; n.style.visibility = 'visible'; n = n.parentElement; }
});
await p.evaluate(() => window.setShopTab('magic'));
await p.waitForTimeout(600);
// seleciona uma poção pra ver a barra de quantidade aparecer
const potId = await p.evaluate(() => {
  const row = [...document.querySelectorAll('.trade-row')].find(r => /potion/i.test(r.textContent));
  if (!row) return null;
  row.click(); return row.textContent.trim().slice(0, 40);
});
await p.waitForTimeout(700);
console.log('selecionou:', potId);
console.log(JSON.stringify(await p.evaluate(() => {
  const w = document.querySelector('.trade-window');
  return { sliders: w.querySelectorAll('.shop-qty-range').length, botoes: w.querySelectorAll('.trade-buy-btn').length,
           total: (w.querySelector('.trade-total') || {}).innerText };
})));
const el = await p.$('.trade-window');
if (el) await el.screenshot({ path: 'scripts/trade-magic.png' });
await p.evaluate(() => window.setShopTab('equipment'));
await p.waitForTimeout(700);
const el2 = await p.$('.trade-window');
if (el2) await el2.screenshot({ path: 'scripts/trade-equip.png' });
await b.close();
