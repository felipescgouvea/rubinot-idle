import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 560, height: 400 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(6500);
  await page.evaluate(() => { document.getElementById('battle-modal-overlay').style.display='flex'; });
  const biomes = ['cave','forest','grass','desert','snow','swamp','jungle','ruins','hell'];
  for (const bi of biomes) {
    await page.evaluate((x) => { document.getElementById('dungeon-stage').dataset.biome = x; }, bi);
    await page.waitForTimeout(900);
    const st = await page.$('#dungeon-stage');
    await st.screenshot({ path: join(ROOT, 'scripts', `bio-${bi}.png`) });
  }
  console.log('screenshots dos 9 biomas ok');
} catch (e) { console.log('EX', e.message); }
finally { await b.close(); }
