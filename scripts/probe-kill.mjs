import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el=document.getElementById('char-name-input'); return !!(el&&el.offsetParent!==null); });
  if (needChar) { await page.fill('#char-name-input','KillP'); await page.evaluate(()=>window.createCharacter&&window.createCharacter('paladin')); await page.waitForTimeout(5000); }
  await page.evaluate(()=>{ window.setDensity&&window.setDensity('pack'); });
  await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills'));
  for (let i=0;i<20;i++){ await page.waitForTimeout(2000); const h=await page.evaluate(()=>document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢')); if(!h) await page.evaluate(()=>window.pickZone&&window.pickZone('femor_hills')); }
  const st = await page.evaluate(() => {
    const log = document.getElementById('combat-log')?.innerText || '';
    const lines = log.split('\n').filter(Boolean);
    const kills = lines.filter(l=>/morreu/i.test(l)).length;
    const hits = lines.filter(l=>/[Gg]olpe b[aá]sico/.test(l)).length;
    const listEmpty = /Sem criaturas|No creatures/.test(document.getElementById('battle-list')?.innerText||'');
    const listCount = document.querySelectorAll('#battle-list .battle-list-entry, #battle-list [class*="battle-list-entry"]').length;
    return { kills, hits, listEmpty, listCount, xp: document.getElementById('player-xp-label')?.textContent, tail: lines.slice(-6) };
  });
  console.log('[probe] kills (morreu):', st.kills, '| golpes:', st.hits);
  console.log('[probe] battle list vazia agora?', st.listEmpty, '| entradas:', st.listCount);
  console.log('[probe] xp label:', st.xp);
  console.log('[probe] últimas linhas:', JSON.stringify(st.tail));
  console.log('[probe] VEREDITO:', st.kills>0 ? 'kills sendo creditados ✅' : 'NENHUM kill creditado ❌');
} catch(e){ console.log('ERRO',e.message); }
finally { await browser.close(); }
