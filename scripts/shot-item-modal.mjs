// Screenshot do modal de detalhe do item (botões temados) em claro e escuro.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const OUT = process.argv[2] || ROOT;
const surl = `${acct.site.replace(/\/$/, '')}/style.css?v=339`;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(surl, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('.item-modal-btn')) break; } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2 });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); if (window.toggleBackpack) window.toggleBackpack(); });
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => {
    const it = document.querySelector('.inv-item');
    if (!it) return 'sem inv-item';
    it.click();
    const ov = document.getElementById('modal-overlay');
    return ov && getComputedStyle(ov).display !== 'none' ? 'ok' : 'modal nao abriu';
  });
  console.log('[item modal]', opened);
  await page.waitForTimeout(400);
  const box = page.locator('#modal-box').first();
  await box.screenshot({ path: join(OUT, 'item-modal-light.png') });
  await page.evaluate(() => window.toggleTheme && window.toggleTheme());
  await page.waitForTimeout(400);
  await box.screenshot({ path: join(OUT, 'item-modal-dark.png') });
  if (problems.length) console.log('ERROS:', problems.join(' | '));
  console.log('OK: item-modal-light/dark.png');
} catch (e) { console.log('ERRO:', e.message); process.exitCode = 1; }
finally { await browser.close(); }
