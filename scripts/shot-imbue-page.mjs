import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o style.css novo (com o painel de imbuing escuro) publicar
for (let i=0;i<30;i++){ try{ const idx=await (await fetch(site+'/index.html',{cache:'no-store'})).text(); const m=idx.match(/style\.css\?v=(\d+)/); if(m){ const css=await (await fetch(site+'/style.css?v='+m[1],{cache:'no-store'})).text(); if(css.includes('--imb-panel-1')) break; } }catch{} await new Promise(r=>setTimeout(r,4000)); }
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="imbue"]', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => document.querySelector('.tab[data-tab="imbue"]')?.click());
  await page.waitForTimeout(1200);
  // seleciona o slot de arma (tem item equipado)
  await page.evaluate(() => window.selectImbueSlot && window.selectImbueSlot('weapon'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-imbue-page.png') });
  const gems = await page.evaluate(() => [...document.querySelectorAll('.imbue-gem-img')].map(i=>({src:i.getAttribute('src'), ok:i.complete&&i.naturalWidth>0})));
  console.log('gems:', JSON.stringify(gems));
} catch (e) { errs.push('EXC '+e.message); }
finally { await browser.close(); }
console.log(errs.length?'ERROS: '+errs.join(' | '):'sem erros');
