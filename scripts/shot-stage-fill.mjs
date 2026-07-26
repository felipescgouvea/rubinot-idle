import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 40; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/);
    if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('100% auto repeat-y')) { console.log('css v' + m[1] + ' ok'); break; } } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#dungeon-stage', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /start|iniciar|caç/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(3000);
  // mede a fração preta nas colunas das bordas do palco
  const box = await page.evaluate(() => { const s = document.getElementById('dungeon-stage').getBoundingClientRect(); return { x: s.x, y: s.y, width: s.width, height: s.height }; });
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-stage-fill.png'), clip: box });
} catch (e) { errs.push('EXC: ' + e.message); }
finally { await browser.close(); }
console.log(errs.length ? '❌ ' + errs.join(' | ') : '✅ shot ok');
