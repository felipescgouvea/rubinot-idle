import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const kitResp = [];
page.on('response', async r => {
  if (r.url().includes('/character/starter-kit')) {
    let body = ''; try { body = await r.text(); } catch {}
    kitResp.push({ status: r.status(), body: body.slice(0,200) });
  }
});
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(5000);
  await page.fill('#char-name-input', 'PalTest');
  await page.evaluate(() => window.createCharacter && window.createCharacter('paladin'));
  await page.waitForTimeout(7000);
  console.log('[probe] resposta starter-kit:', JSON.stringify(kitResp));
  // Lê o slot de munição e o inventário via DOM
  const ammoSlot = await page.evaluate(() => {
    const el = document.querySelector('[data-slot="ammo"], #eq-ammo, .equipment-slot-ammo');
    return el ? el.innerHTML.slice(0,200) : 'slot ammo não encontrado';
  });
  const invArrows = await page.evaluate(() => {
    const txt = document.body.innerText;
    const m = txt.match(/Simple Arrow[^\n]*/i);
    return m ? m[0] : 'sem menção a arrow no texto';
  });
  console.log('[probe] ammo slot DOM:', JSON.stringify(ammoSlot.replace(/\s+/g,' ')));
  console.log('[probe] arrow no inventário:', JSON.stringify(invArrows));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
