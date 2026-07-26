// Verifica no viewport de celular: SEM rolagem lateral e alvos de toque do
// topbar/fight-mode ≥ 40px. Contra produção.
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
      if (css.includes('.char-skills') && css.includes('min-height: 44px')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForFunction(() => { const g = document.getElementById('auth-gate'); return !g || g.style.display === 'none' || g.offsetParent === null; }, { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    // pior alvo de toque do topbar + fight/density
    const targets = [...document.querySelectorAll('#topbar .btn-small, .fight-mode-btn, .density-btn, #combat-log-tabs .log-tab')]
      .filter(el => el.offsetParent !== null)
      .map(el => Math.round(el.getBoundingClientRect().height));
    // ainda algum elemento estoura?
    let over = 0;
    for (const el of document.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (b.width > vw + 2 && b.right > vw + 2 && el.offsetParent !== null) over++;
    }
    return { vw, scrollW, minTarget: targets.length ? Math.min(...targets) : null, targetsN: targets.length, overflowers: over };
  });
  console.log('[mobile]', JSON.stringify(r));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-mobile-game.png') });
  if (r.scrollW > r.vw + 2) problems.push(`ainda rola lateral: scrollW ${r.scrollW} > vw ${r.vw} (${r.overflowers} elementos estouram)`);
  if (r.minTarget != null && r.minTarget < 38) problems.push(`alvo de toque pequeno: menor = ${r.minTarget}px (esperado ≥38)`);
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ mobile: sem rolagem lateral, alvos de toque ≥38px; 0 erros');
process.exitCode = problems.length ? 1 : 0;
