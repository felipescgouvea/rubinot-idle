// Verifica no TEMA ESCURO: cards de task e botões de nav da Loja devem ficar
// definidos (sem creme hardcoded berrante). Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o style.css com a mudança do shop-tab-btn theme-aware
for (let i = 0; i < 30; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/); if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('creme-claro berrante')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="tasks"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // liga o tema escuro
  await page.evaluate(() => { if (document.documentElement.getAttribute('data-theme') !== 'dark') document.getElementById('theme-toggle-btn')?.click(); });
  await page.waitForTimeout(500);
  for (const [tab, file] of [['tasks', 'shot-tab-tasks-dark.png'], ['shop', 'shot-tab-shop-dark.png']]) {
    await page.evaluate(t => document.querySelector(`.tab[data-tab="${t}"]`)?.click(), tab);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(ROOT, 'scripts', file) });
    console.log('salvo', file);
  }
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
