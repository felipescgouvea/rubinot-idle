import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const SHOT = process.env.SHOT || join(ROOT, 'scratch-battle.png');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1366, height: 820 });
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el = document.getElementById('char-name-input'); return !!(el && el.offsetParent !== null); });
  if (needChar) {
    await page.fill('#char-name-input', 'ShotP');
    await page.evaluate(() => window.createCharacter && window.createCharacter('paladin'));
    await page.waitForTimeout(4000);
  }
  await page.evaluate(() => window.pickZone && window.pickZone('wolf_den'));
  await page.waitForTimeout(6000); // acumula log + battle list
  await page.evaluate(() => window.openBattleModal && window.openBattleModal());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT });
  const h = await page.evaluate(() => {
    const g = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : null; };
    const gw = id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().width) : null; };
    const cl = document.getElementById('combat-log');
    const r = cl?.getBoundingClientRect();
    return {
      modalW: gw('battle-modal-box'), modalH: g('battle-modal-box'),
      sceneH: g('battle-scene'), stageH: g('dungeon-stage'),
      listH: g('battle-list'), logH: g('combat-log'),
      logBottom: r ? Math.round(r.bottom) : null, viewportH: window.innerHeight,
      logBelow: r ? r.bottom > window.innerHeight : null,
      logLines: cl ? cl.querySelectorAll('.log-line').length : null,
    };
  });
  console.log('[probe] medidas:', JSON.stringify(h));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
