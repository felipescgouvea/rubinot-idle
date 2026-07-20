import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const gl=[]; let t0=Date.now(); let lastKey='';
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  try { const j = await r.json();
    if (Array.isArray(j.pack)) {
      const g = j.pack.find(m=>m.defKey==='goblin_leader');
      const front = j.pack[0];
      const key = g ? `uid=${g.uid} hp=${g.hp}/${g.maxHp} front=${front?.defKey}` : '';
      if (g && key !== lastKey) { gl.push(`${((Date.now()-t0)/1000).toFixed(1)}s ${key}`); lastKey=key; }
    }
  } catch(e){}
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','GoblinD'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('druid')); await page.waitForTimeout(5000); }
  await page.evaluate(()=>window.setDensity&&window.setDensity('solo'));
  await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills'));
  for (let i=0;i<30;i++){
    await page.waitForTimeout(2000);
    const h = await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
    if(!h){ await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills')); }
  }
  console.log('[probe] trajetória do goblin_leader (só mudanças):', gl.length);
  gl.forEach(s=>console.log('  '+s));
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
