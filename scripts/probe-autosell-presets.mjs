import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i=0;i<30;i++){ try{ const idx=await (await fetch(site+'/index.html',{cache:'no-store'})).text(); const m=idx.match(/settingsPanel\.js\?v=(\d+)/); if(m){ const js=await (await fetch(site+'/src/ui/settingsPanel.js?v='+m[1],{cache:'no-store'})).text(); if(js.includes('autosell-preset')) break; } }catch{} await new Promise(r=>setTimeout(r,4000)); }
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const problems=[]; page.on('pageerror',e=>problems.push(e.message)); page.on('console',m=>{if(m.type()==='error')problems.push('console:'+m.text());});
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => window.openSettingsPanel && window.openSettingsPanel());
  await page.waitForSelector('.autosell-preset', { timeout: 10000 });
  const nPresets = await page.$$eval('.autosell-preset', els=>els.length);
  // clica "Lixo comum" (junk)
  await page.evaluate(() => { const b=[...document.querySelectorAll('.autosell-preset')].find(x=>/comum|common/i.test(x.textContent)); b&&b.click(); });
  await page.waitForTimeout(600);
  const state = await page.evaluate(() => ({
    maxVal: document.querySelector('.autosell-input')?.value,
    activeText: document.querySelector('.autosell-preset.active')?.textContent?.trim(),
    checked: document.querySelector('.autosell-toggle input')?.checked,
  }));
  await page.screenshot({ path: join(ROOT,'scripts','shot-autosell-presets.png') });
  console.log('[probe]', JSON.stringify({ nPresets, ...state }));
  if (nPresets !== 3) problems.push('esperava 3 presets, achei '+nPresets);
  if (state.maxVal !== '250') problems.push('Lixo comum não setou maxValue=250 (got '+state.maxVal+')');
  if (!/comum|common/i.test(state.activeText||'')) problems.push('destaque ativo não é o Lixo comum (got '+state.activeText+')');
  if (!state.checked) problems.push('auto-sell não ficou ligado após preset');
} catch (e) { problems.push('EXC '+e.message); }
finally { await browser.close(); }
console.log(problems.length?'\nX '+problems.join('\nX '):'\nOK presets funcionam (Lixo comum -> 250, ligado, destaque), 0 erros');
process.exitCode = problems.length?1:0;
