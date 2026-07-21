import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  // abre a janela de batalha
  await page.evaluate(() => { const o = document.getElementById('battle-modal-overlay'); if (o) o.style.display='flex'; });
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const b = document.getElementById('hunt-toggle');
    return { text: b ? b.textContent.trim() : null, hasSvg: !!(b && b.querySelector('svg.ht-icon')), stopClass: b ? b.classList.contains('stop') : null };
  });
  console.log('[probe] hunt-toggle:', JSON.stringify(info));
  const btn = await page.$('#hunt-toggle');
  if (btn) await btn.screenshot({ path: join(ROOT, 'scripts', 'startstop.png') });
  ok = info.hasSvg;
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ botão Start/Stop com ícone custom SVG' : '❌ sem svg.ht-icon');
process.exitCode = ok ? 0 : 1;
