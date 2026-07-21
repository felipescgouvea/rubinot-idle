import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 520, height: 500 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(6500);
  await page.evaluate(() => {
    const o = document.getElementById('battle-modal-overlay'); if (o) o.style.display='flex';
    const set=(id,w,txt)=>{const e=document.getElementById(id);if(e)e.style.width=w; };
    document.getElementById('player-hp-fill').style.width='62%';
    document.getElementById('player-hp-fill').className='player-hp-fill hp-state-mid';
    document.getElementById('player-mana-fill').style.width='45%';
    document.getElementById('player-xp-fill').style.width='30%';
    document.getElementById('player-hp-label').textContent='682 / 1100';
    document.getElementById('player-mana-label').textContent='405 / 900';
    document.getElementById('player-xp-label').textContent='30% XP';
    document.getElementById('player-battle-name').textContent='Test Knight';
  });
  await page.waitForTimeout(500);
  const scene = await page.$('#battle-scene');
  if (scene) await scene.screenshot({ path: join(ROOT, 'scripts', 'bars.png') });
  console.log('ok');
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
