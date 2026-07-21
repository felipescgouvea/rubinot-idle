import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const seen = new Map(); // uid -> defKey (spawn único)
page.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  try { const j = await r.json();
    if (Array.isArray(j.pack)) j.pack.forEach(m => { if(!seen.has(m.uid)) seen.set(m.uid, m.defKey); });
  } catch(e){}
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','DistP'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('paladin')); await page.waitForTimeout(5000); }
  await page.evaluate(()=>window.setDensity&&window.setDensity('pack'));
  await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills'));
  for (let i=0;i<30;i++){ await page.waitForTimeout(2000); const h=await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢')); if(!h) await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills')); }
  const cnt={}; for(const dk of seen.values()) cnt[dk]=(cnt[dk]||0)+1;
  const total=seen.size;
  console.log('[probe] spawns únicos:', total);
  const target={goblin:47,goblin_scavenger:32,goblin_assassin:16,goblin_leader:5};
  Object.keys(target).forEach(k=>{ const real=((cnt[k]||0)/total*100).toFixed(1); console.log(`  ${k}: real ${real}% | alvo ${target[k]}%`); });
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
