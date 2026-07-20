import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const samples = [];
let t0 = null;
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  try {
    const j = await r.json();
    if (!j.pack) return;
    if (t0 === null) t0 = Date.now();
    const gl = j.pack.filter(m => m.defKey === 'goblin_leader');
    if (gl.length) {
      const rel = ((Date.now()-t0)/1000).toFixed(1);
      gl.forEach(m => samples.push(`${rel}s uid=${m.uid} hp=${m.hp}/${m.maxHp}`));
    }
  } catch {}
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.pickZone && window.pickZone('femor_hills'));
  console.log('[probe] caçando femor_hills 45s, interceptando goblin_leader...');
  await page.waitForTimeout(45000);
  console.log(`[probe] amostras de goblin_leader (${samples.length}):`);
  samples.slice(0, 60).forEach(s => console.log('  ' + s));
  const uids = new Set(samples.map(s => s.match(/uid=(\d+)/)?.[1]));
  console.log('[probe] uids distintos de goblin_leader:', uids.size, [...uids].slice(0,20).join(','));
  const zeroStuck = samples.filter(s => /hp=0\//.test(s));
  console.log('[probe] amostras com hp=0:', zeroStuck.length);
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
