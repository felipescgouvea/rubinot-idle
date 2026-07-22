import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('#auth-email', { timeout: 30000 });
await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
await p.click('#auth-submit'); await p.waitForTimeout(8000);
await p.evaluate(() => { let n = document.getElementById('shop-content'); while (n && n !== document.body) { n.style.display='block'; n.style.visibility='visible'; n=n.parentElement; } });
for (const [loja, grupo, file] of [['equipment','magic','shot-wands.png'], ['magic','runes','shot-runes.png'], ['magic','potions','shot-potions.png']]) {
  await p.evaluate(k => window.setShopTab(k), loja);
  await p.waitForTimeout(400);
  await p.evaluate(([l,g]) => window.setShopGroup(l,g), [loja,grupo]);
  await p.waitForTimeout(1200);
  const el = await p.$('#shop-content');
  if (el) await el.screenshot({ path: 'scripts/' + file });
}
await b.close();
