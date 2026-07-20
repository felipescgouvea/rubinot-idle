import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el = document.getElementById('char-name-input'); return !!(el && el.offsetParent !== null); });
  if (needChar) {
    await page.fill('#char-name-input', 'MeasureP');
    await page.evaluate(() => window.createCharacter && window.createCharacter('paladin'));
    await page.waitForTimeout(4000);
  }
  await page.evaluate(() => window.openBattleModal && window.openBattleModal());
  await page.waitForTimeout(1500);
  const h = await page.evaluate(() => {
    const g = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : null; };
    const gc = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height) : null; };
    return {
      viewportH: window.innerHeight,
      modalBox: g('battle-modal-box'),
      modalBody: g('battle-modal-body'),
      topRow: gc('.battle-top-row'),
      battleScene: g('battle-scene'),
      huntToggle: g('hunt-toggle'),
      combatLogCard: g('combat-log-card'),
      combatLog: g('combat-log'),
      combatLogTabs: g('combat-log-tabs'),
      logVisible: (()=>{ const e=document.getElementById('combat-log'); if(!e) return null; const r=e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), belowViewport: r.bottom > window.innerHeight }; })(),
    };
  });
  console.log('[probe] alturas (viewport 1280x720):', JSON.stringify(h, null, 1));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
