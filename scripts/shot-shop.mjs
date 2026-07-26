// Diagnóstico: abre a Loja e screenshota o painel inteiro pra ver a paleta.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const OUT = process.argv[2] || ROOT;
// espera o deploy do style.css com os botões dourados
const surl = `${acct.site.replace(/\/$/, '')}/style.css?v=338`;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(surl, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('.shop-main .skill-upgrade-btn')) break; } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 950 }, deviceScaleFactor: 2 });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  // fecha a modal de progresso offline ("While you were away") se aparecer
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.getByRole('button', { name: 'Close' }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => {
    const t = document.querySelector('.tab[data-tab="shop"]');
    if (!t) return 'sem aba shop';
    t.click();
    return document.querySelector('.shop-layout') ? 'ok' : 'sem .shop-layout apos click';
  });
  console.log('[shop] abrir:', opened);
  await page.waitForTimeout(600);
  const el = page.locator('#tab-shop').first();
  await el.screenshot({ path: join(OUT, 'shop.png') });
  console.log('OK: shop.png');
} catch (e) { console.log('ERRO:', e.message); process.exitCode = 1; }
finally { await browser.close(); }
