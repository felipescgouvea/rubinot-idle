import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let latestPack = [];
page.on('response', async r => { if(!r.url().includes('/hunt/state'))return; try{const j=await r.json(); if(Array.isArray(j.pack)) latestPack=j.pack.map(m=>({uid:String(m.uid),hp:m.hp,def:m.defKey}));}catch(e){} });
function hpOf(uid){ const m=latestPack.find(x=>x.uid===uid); return m?m.hp:null; }
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','TgtP'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('paladin')); await page.waitForTimeout(5000); }
  await page.evaluate(()=>window.setDensity&&window.setDensity('pack'));
  await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills'));
  // espera um pack com >=3 monstros
  let picked=null;
  for(let i=0;i<15;i++){ await page.waitForTimeout(1000); if(latestPack.filter(m=>m.hp>0).length>=3){ const alive=latestPack.filter(m=>m.hp>0); picked=alive[alive.length-1].uid; break; } }
  if(!picked){ console.log('[probe] não consegui um pack com 3+ vivos'); }
  else {
    const before=hpOf(picked);
    console.log('[probe] alvo do FUNDO uid=', picked, 'hp inicial=', before, '| frente uid=', latestPack.filter(m=>m.hp>0)[0].uid);
    await page.evaluate((uid)=>window.selectTarget&&window.selectTarget(uid), picked);
    // observa o hp do alvo escolhido por 8s
    const traj=[];
    for(let i=0;i<8;i++){ await page.waitForTimeout(1000); traj.push(hpOf(picked)); }
    console.log('[probe] hp do alvo escolhido após selecionar:', JSON.stringify(traj));
    const dropped = traj.some(h=>h!=null && h<before);
    console.log('[probe] VEREDITO M2:', dropped ? 'o alvo ESCOLHIDO tomou dano ✅' : 'alvo escolhido NÃO tomou dano ❌');
  }
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
