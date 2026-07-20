import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(5000);
  await page.click('button.tab[data-tab="bossrush"]');
  await page.waitForTimeout(1500);
  const cards = await page.$$('#bossrush-grid .zone-card');
  console.log('[probe] cards de boss:', cards.length);
  if (!cards.length) { console.log('[probe] nenhum card — abortando'); }
  else {
    const first = await page.evaluate(() => {
      const c = document.querySelector('#bossrush-grid .zone-card');
      return { name: c.querySelector('.zone-card-name')?.innerText, hp: c.querySelector('.zone-card-mults')?.innerText };
    });
    console.log('[probe] desafiando primeiro boss:', JSON.stringify(first));
    await cards[0].$eval('button', b => b.click());
    console.log('[probe] caçando 100s...');
    await page.waitForTimeout(100000);
    const log = await page.evaluate(() => document.getElementById('combat-log')?.innerText.split('\n').filter(Boolean).slice(-8));
    console.log('[probe] log:', JSON.stringify(log));
    const tiers = await page.evaluate(() => window.__G ? window.__G.bossTiers : (window.G ? window.G.bossTiers : null));
    console.log('[probe] bossTiers:', JSON.stringify(tiers));
  }
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
