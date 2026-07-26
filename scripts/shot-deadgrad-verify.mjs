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
      if (css.includes('align-items: stretch; gap: 12px; min-height')) { console.log('css v' + m[1] + ' ok'); break; } } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
async function deadFrac(tab) {
  // fração da altura da viewport ABAIXO do fim do #app-content (gradiente morto)
  return page.evaluate(() => {
    const c = document.getElementById('app-content');
    if (!c) return 1;
    const r = c.getBoundingClientRect();
    const vh = window.innerHeight;
    const below = Math.max(0, vh - r.bottom);
    return +(below / vh).toFixed(3);
  });
}
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="worlds"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  const res = {};
  for (const tab of ['worlds', 'highscores', 'hunt']) {
    await page.evaluate(t => document.querySelector(`.tab[data-tab="${t}"]`)?.click(), tab);
    await page.waitForTimeout(1200);
    res[tab] = await deadFrac(tab);
    await page.screenshot({ path: join(ROOT, 'scripts', `shot-dg-${tab}.png`) });
  }
  console.log('[deadFrac abaixo do #app-content]', JSON.stringify(res));
  // sidebar deve alcançar (quase) o fundo do #app
  const framed = await page.evaluate(() => {
    const app = document.getElementById('app'), sb = document.getElementById('sidebar');
    const ar = app.getBoundingClientRect(), sr = sb.getBoundingClientRect();
    return +(sr.height / ar.height).toFixed(3);
  });
  console.log('[sidebar/app altura]', framed);
  if (res.worlds > 0.12) errs.push('Worlds ainda tem ' + Math.round(res.worlds*100) + '% de gradiente morto embaixo');
  if (res.highscores > 0.12) errs.push('Highscores ainda tem ' + Math.round(res.highscores*100) + '% morto');
} catch (e) { errs.push('EXC: ' + e.message); }
finally { await browser.close(); }
console.log(errs.length ? '\n❌ ' + errs.join('\n❌ ') : '\n✅ colunas esticam até embaixo; sem gradiente morto; 0 erros');
process.exitCode = errs.length ? 1 : 0;
