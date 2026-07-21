import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(6500);
  await page.click('.tab[data-tab="hunt"]'); await page.waitForTimeout(1000);
  const info = await page.evaluate(() => ({
    ghosts: document.querySelectorAll('.equip-slot-ghost-img').length,
    loaded: Array.from(document.querySelectorAll('.equip-slot-ghost-img')).filter(i=>i.complete&&i.naturalWidth>0).length,
  }));
  console.log('[probe]', JSON.stringify(info));
  const card = await page.$('#equip-card');
  if (card) await card.screenshot({ path: join(ROOT, 'scripts', 'equip.png') });
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
