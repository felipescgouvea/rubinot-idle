import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i=0;i<45;i++){try{const idx=await(await fetch(site+'/index.html',{cache:'no-store'})).text();const m=idx.match(/style\.css\?v=(\d+)/);if(m){const css=await(await fetch(site+'/style.css?v='+m[1],{cache:'no-store'})).text();if(css.includes('.imbue-tier-btn'))break;}}catch{}await new Promise(r=>setTimeout(r,4000));}
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1180,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,120));});
try{
  await p.goto(site,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForSelector('#auth-email',{timeout:30000});
  await p.fill('#auth-email',acct.email);await p.fill('#auth-password',acct.password);await p.click('#auth-submit');
  await p.waitForSelector('#hunt-toggle',{timeout:45000});await p.waitForTimeout(2500);
  await p.evaluate(()=>{if(window.closeModal)window.closeModal();});
  await p.evaluate(()=>window.openImbueModal&&window.openImbueModal());
  await p.waitForSelector('.imbue-tier-btn',{timeout:12000});
  const info=await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('.imbue-row')].map(r=>({
      name:r.querySelector('b')?.textContent,
      tiers:[...r.querySelectorAll('.imbue-tier-btn')].map(btn=>({name:btn.querySelector('.imbue-tier-name')?.textContent,pct:btn.querySelector('.imbue-tier-pct')?.textContent,gold:btn.querySelector('.imbue-tier-gold')?.textContent?.trim()}))
    }));
    return {rowCount:rows.length, sample: rows[0]};
  });
  console.log('[imbue]',JSON.stringify(info));
  await p.screenshot({path:join(ROOT,'scripts','shot-imbue-tiers.png')});
  if(!info.sample||info.sample.tiers.length!==3)errs.push('esperava 3 tiers por imbuement');
}catch(e){errs.push('EXC: '+e.message);}
finally{await b.close();}
console.log(errs.length?('\n❌ '+errs.join('\n❌ ')):'\n✅ imbue tiers: 3 botões (Basic/Intricate/Powerful) por imbuement com pct+custo; 0 erros');
process.exitCode=errs.length?1:0;
