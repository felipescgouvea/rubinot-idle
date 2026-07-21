import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 560, height: 520 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(6500);
  await page.evaluate(() => {
    const o = document.getElementById('battle-modal-overlay'); if (o) o.style.display='flex';
    const st = document.getElementById('dungeon-stage');
    st.dataset.biome = 'cave'; st.classList.add('searching');
    // injeta um monstro (rat) na frente pra contexto
    let pack = document.getElementById('stage-pack');
    if (!pack) { pack = document.createElement('div'); pack.id='stage-pack'; st.appendChild(pack); }
    pack.innerHTML = '<img src="assets/sprites/monsters/Rat.webp" style="position:absolute; left:50%; top:34px; width:52px; transform:translateX(-50%); image-rendering:pixelated;">';
  });
  await page.waitForTimeout(700);
  const st = await page.$('#dungeon-stage');
  if (st) await st.screenshot({ path: join(ROOT, 'scripts', 'cave.png') });
  console.log('ok');
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
