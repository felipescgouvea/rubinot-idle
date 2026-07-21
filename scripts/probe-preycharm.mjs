import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  // clique via JS: o chrome do jogo às vezes tem overlay por cima e o
  // click "de verdade" do Playwright fica em retry até estourar
  await page.evaluate(() => document.querySelector('.tab[data-tab="bestiary"]').click()); await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({
    preyCards: document.querySelectorAll('.prey-card').length,
    charmRows: document.querySelectorAll('.charm-row').length,
    charmSprites: Array.from(document.querySelectorAll('.charm-icon-img')).filter(i=>i.complete&&i.naturalWidth>0).length,
  }));
  console.log('[probe]', JSON.stringify(info));
  const prey = await page.$('#tab-bestiary .full-card:nth-of-type(1)');
  if (prey) await prey.screenshot({ path: join(ROOT, 'scripts', 'panel-prey.png') });
  const charms = await page.$('#tab-bestiary .full-card:nth-of-type(2)');
  if (charms) await charms.screenshot({ path: join(ROOT, 'scripts', 'panel-charms.png') });
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
