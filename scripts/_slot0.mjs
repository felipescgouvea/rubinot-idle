import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
p.on('dialog', d => d.accept());
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await login(p, acct);
await instalarLiveImport(p);
const antes = await p.evaluate(() => window.__ACC.activeSlot);
if (antes !== 0) {
  await p.evaluate(async () => { const a = await window.__liveImport('accountUseCases.js'); a.confirmSwitchCharacterSlot(0); });
  await esperarReload(p);
  await instalarLiveImport(p);
}
console.log('slot ativo:', await p.evaluate(() => ({ slot: window.__ACC.activeSlot, voc: window.__G.vocation, lvl: window.__G.level, grad: window.__G.graduated })));
await b.close();
