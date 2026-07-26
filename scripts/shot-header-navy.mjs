// Screenshot: header (#topbar) + painel lateral (#sidebar) devem ter a mesma
// navy; e o botão "Trocar Hunt". Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o style.css novo (com o gradiente do sidebar no #topbar)
for (let i = 0; i < 30; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/); if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('#hunt-status-switch-btn.btn-blue')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // amostra a cor de fundo computada do topbar e do sidebar (primeira parada do gradiente)
  const colors = await page.evaluate(() => {
    const g = el => el ? getComputedStyle(el).backgroundImage.slice(0, 90) : null;
    return { topbar: g(document.getElementById('topbar')), sidebar: g(document.getElementById('sidebar')) };
  });
  console.log('[probe]', JSON.stringify(colors));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-header-navy.png') });
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '❌ ' + problems.join('\n❌ ') : '✅ screenshot salvo (shot-header-navy.png)');
process.exitCode = problems.length ? 1 : 0;
