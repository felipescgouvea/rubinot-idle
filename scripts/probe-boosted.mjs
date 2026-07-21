// Probe: o painel Boosted mostra o bônus "2× XP · loot"?
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  const txt = await page.evaluate(() => Array.from(document.querySelectorAll('.boosted-bonus')).map(e => e.innerText));
  console.log('[probe] .boosted-bonus =', JSON.stringify(txt));
  ok = txt.length >= 2 && txt.every(t => /2×|2x/.test(t));
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ painel Boosted mostra o bônus 2×' : '❌ label de bônus do Boosted ausente');
process.exitCode = ok ? 0 : 1;
