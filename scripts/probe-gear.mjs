import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 400 } });
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  const res = await page.evaluate(() => {
    const s = document.querySelector('[data-icon="settings"][onclick]');
    const admin = document.querySelector('.tab[data-tab="admin"]');
    return { settingsGear: !!(s && s.querySelector('svg.gear-svg')), adminGear: !!(admin && admin.querySelector('svg.gear-svg')) };
  });
  console.log('[probe] gear:', JSON.stringify(res));
  const hdr = await page.$('#header-btns');
  if (hdr) await hdr.screenshot({ path: join(ROOT, 'scripts', 'gear.png') });
  ok = res.settingsGear;
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ engrenagem custom no Settings' : '❌');
process.exitCode = ok ? 0 : 1;
