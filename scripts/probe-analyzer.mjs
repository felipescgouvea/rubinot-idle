import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  await page.click('.tab[data-tab="hunt"]'); await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('#hunt-analyzer-body .ha-label'));
    return labels.map(l => ({ text: l.textContent.trim(), img: !!l.querySelector('img'), loaded: (()=>{const i=l.querySelector('img');return i?(i.complete&&i.naturalWidth>0):null;})() }));
  });
  console.table(res);
  const imgs = res.filter(r => r.img && r.loaded);
  console.log(`[probe] ${imgs.length}/${res.length} labels do Analyzer com sprite`);
  const card = await page.$('#hunt-analyzer-card');
  if (card) await card.screenshot({ path: join(ROOT, 'scripts', 'analyzer.png') });
  ok = res.length === 6 && imgs.length === 6;
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ Analyzer todo em sprite' : '❌');
process.exitCode = ok ? 0 : 1;
