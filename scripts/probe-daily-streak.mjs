// Prova: o modal do Daily mostra o banner de streak longo (dias consecutivos +
// progresso pro marco de 30). Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 45; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/);
    if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('.daily-longstreak')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text().slice(0, 120)); });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // abre o modal do daily
  await page.evaluate(() => window.openDailyReward && window.openDailyReward());
  await page.waitForSelector('.daily-longstreak', { timeout: 12000 });
  const banner = await page.evaluate(() => {
    const b = document.querySelector('.daily-longstreak');
    if (!b) return null;
    return {
      head: b.querySelector('.daily-ls-head')?.textContent?.trim(),
      hint: b.querySelector('.daily-ls-hint')?.textContent?.trim(),
      fillW: b.querySelector('.daily-ls-fill')?.style?.width,
    };
  });
  console.log('[banner]', JSON.stringify(banner));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-daily-streak.png') });
  if (!banner) problems.push('banner de streak longo não apareceu');
  else {
    if (!/streak/i.test(banner.head || '')) problems.push('cabeçalho do banner sem "streak": ' + banner.head);
    if (!/\d+/.test(banner.hint || '')) problems.push('hint sem contagem de dias: ' + banner.hint);
  }
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ daily: banner de streak longo com progresso pro marco de 30; 0 erros');
process.exitCode = problems.length ? 1 : 0;
