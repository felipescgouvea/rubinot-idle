// Auditoria mobile: viewport de celular (390x844), screenshot de abas-chave e
// medição de alvos de toque pequenos (< 40px) e overflow horizontal.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // overflow horizontal do body?
  const overflow = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  // alvos de toque pequenos (interativos < 40px em alguma dimensão)
  const smallTargets = await page.evaluate(() => {
    const sel = 'button, .tab, a, input, .charm-btn, .prey-btn, .fight-mode-btn, .shop-tab-btn, .item-modal-btn';
    const out = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // invisível
      if (el.offsetParent === null) continue;
      if (r.height < 36 || r.width < 28) out.push({ t: (el.textContent || el.id || el.className).trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out.slice(0, 30);
  });
  console.log('[overflow]', JSON.stringify(overflow), overflow.scrollW > overflow.clientW + 1 ? '❌ ROLA LATERAL' : 'ok');
  console.log('[alvos < 36px alt / 28px larg]', smallTargets.length, JSON.stringify(smallTargets.slice(0, 12)));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-mobile-hunt.png'), fullPage: false });
  // aba com muitos botões: RTC
  await page.evaluate(() => document.querySelector('.tab[data-tab="rtc"]')?.click());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-mobile-rtc.png'), fullPage: false });
} finally { await browser.close(); }
console.log('ok');
