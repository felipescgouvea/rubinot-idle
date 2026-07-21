import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0,160)));
p.on('response', async r => { if (r.url().includes('/hunt/')) console.log('HTTP', r.status(), r.url().split('/').slice(-1)[0], (await r.text().catch(()=>'')).slice(0,220)); });
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('#auth-email', { timeout: 30000 });
await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
await p.click('#auth-submit'); await p.waitForTimeout(8000);
console.log('estado:', await p.evaluate(async () => {
  const g = await import('./src/application/gameStore.js?v=166');
  return { voc: g.G.vocation, lvl: g.G.level, zona: g.G.activeZone, hunting: g.G.hunting, hp: g.G.hp };
}));
await p.evaluate(async () => {
  const m = await import('./src/application/huntUseCases.js?v=229');
  m.selectZone('rat_cave');
  await new Promise(r => setTimeout(r, 800));
  await m.startHunt();
});
await p.waitForTimeout(15000);
console.log('depois de 15s:', await p.evaluate(async () => {
  const g = await import('./src/application/gameStore.js?v=166');
  const m = await import('./src/application/huntUseCases.js?v=229');
  return { hunting: g.G.hunting, zona: g.G.activeZone, monstro: m.getCurrentMonster()?.name || null, pack: (m.getCurrentPack()||[]).length, hp: g.G.hp };
}));
console.log('log:', await p.evaluate(() => [...document.getElementById('combat-log').children].slice(-6).map(n=>n.innerText.trim()).join(' // ')));
await b.close();
