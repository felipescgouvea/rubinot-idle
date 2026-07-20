import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let stateCount = 0, packSeen = 0;
const defkeys = {};
const glSamples = [];
let t0 = Date.now();
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  stateCount++;
  try {
    const j = await r.json();
    if (Array.isArray(j.pack)) {
      j.pack.forEach(m => { packSeen++; defkeys[m.defKey] = (defkeys[m.defKey]||0)+1;
        if (m.defKey === 'goblin_leader') glSamples.push(`${((Date.now()-t0)/1000).toFixed(1)}s uid=${m.uid} hp=${m.hp}/${m.maxHp}`); });
    }
  } catch(e) { defkeys['__jsonfail']=(defkeys['__jsonfail']||0)+1; }
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  const lvl = await page.evaluate(() => document.getElementById('hdr-level')?.textContent);
  console.log('[probe] nível exibido:', lvl);
  await page.evaluate(() => window.pickZone && window.pickZone('femor_hills'));
  await page.waitForTimeout(3000);
  const hunting = await page.evaluate(() => document.getElementById('hdr-hunt-status')?.textContent);
  console.log('[probe] status:', hunting);
  await page.waitForTimeout(40000);
  console.log('[probe] /hunt/state respostas:', stateCount, '| monstros no pack vistos:', packSeen);
  console.log('[probe] defKeys:', JSON.stringify(defkeys));
  console.log('[probe] goblin_leader amostras:', glSamples.length);
  glSamples.slice(0,40).forEach(s=>console.log('  '+s));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
