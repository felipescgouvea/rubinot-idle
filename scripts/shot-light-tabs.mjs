import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="worlds"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  for (const tab of ['worlds', 'highscores']) {
    await page.evaluate(t => document.querySelector(`.tab[data-tab="${t}"]`)?.click(), tab);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(ROOT, 'scripts', `shot-tab-${tab}.png`) });
  }
} finally { await browser.close(); }
console.log('ok');
