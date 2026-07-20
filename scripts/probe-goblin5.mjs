import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const gl=[]; let t0=Date.now(); let last='';
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  try { const j = await r.json();
    if (Array.isArray(j.pack)) {
      const g = j.pack.find(m=>m.defKey==='goblin_leader');
      const k = g?`uid=${g.uid} hp=${g.hp}/${g.maxHp}`:'(vazio)';
      if (k!==last){ gl.push(`${((Date.now()-t0)/1000).toFixed(1)}s ${k}`); last=k; }
    }
  } catch(e){}
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','GoblinB'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('druid')); await page.waitForTimeout(5000); }
  // Boss rush femor_hills = só goblin_leader como alvo
  await page.evaluate(()=>window.challengeBoss&&window.challengeBoss('femor_hills'));
  await page.waitForTimeout(2000);
  console.log('[probe] status:', await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent));
  for (let i=0;i<25;i++){
    await page.waitForTimeout(2000);
    const h = await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
    if(!h){ await page.evaluate(()=>window.challengeBoss&&window.challengeBoss('femor_hills')); }
  }
  console.log('[probe] trajetória goblin_leader (boss rush):', gl.length);
  gl.forEach(s=>console.log('  '+s));
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
