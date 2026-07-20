import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let stateCount=0, packSeen=0; const defkeys={}; const gl=[]; let t0=Date.now();
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return; stateCount++;
  try { const j = await r.json();
    if (Array.isArray(j.pack)) j.pack.forEach(m => { packSeen++; defkeys[m.defKey]=(defkeys[m.defKey]||0)+1;
      if (m.defKey==='goblin_leader') gl.push(`${((Date.now()-t0)/1000).toFixed(1)}s uid=${m.uid} hp=${m.hp}/${m.maxHp}`); });
  } catch(e){ defkeys['__fail']=(defkeys['__fail']||0)+1; }
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','GoblinP'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('paladin')); await page.waitForTimeout(5000); }
  await page.evaluate(()=>window.setDensity&&window.setDensity('pack'));
  await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills'));
  await page.waitForTimeout(2000);
  console.log('[probe] status inicial:', await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent));
  // loop 50s, re-caça se morrer
  for (let i=0;i<25;i++){
    await page.waitForTimeout(2000);
    const h = await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
    if(!h){ await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills')); }
  }
  console.log('[probe] respostas:',stateCount,'| pack visto:',packSeen,'| defKeys:',JSON.stringify(defkeys));
  console.log('[probe] goblin_leader amostras:',gl.length);
  gl.slice(0,50).forEach(s=>console.log('  '+s));
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
