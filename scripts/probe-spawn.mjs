import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0,160)));
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('#auth-email', { timeout: 30000 });
await p.fill('#auth-email', acct.email); await p.fill('#auth-password', acct.password);
await p.click('#auth-submit'); await p.waitForTimeout(8000);
await p.evaluate(async () => {
  window.__G = (await import('./src/application/gameStore.js?v=166')).G;
  window.__H = await import('./src/application/huntUseCases.js?v=229');
});
// captura as respostas de /hunt/state DEPOIS do start
const states = [];
p.on('response', async r => {
  if (!r.url().includes('/hunt/state')) return;
  const j = await r.json().catch(() => null);
  if (j) states.push({ hunting: j.hunting, zone: j.zoneId, sess: (j.sessionId||'').slice(0,8), pack: (j.pack||[]).length, kills: (j.killEvents||[]).length, vitals: j.vitals ? `${j.vitals.hp}hp` : null });
});
console.log('antes:', await p.evaluate(() => ({ hunting: window.__G.hunting, zona: window.__G.activeZone })));
if (await p.evaluate(() => window.__G.hunting)) { await p.evaluate(() => window.toggleHunt()); await p.waitForFunction(() => !window.__G.hunting, null, {timeout:20000}).catch(()=>{}); }
await p.evaluate(() => window.__H.selectZone('rat_cave'));
await p.waitForTimeout(800);
await p.evaluate(() => window.__H.startHunt());
await p.waitForTimeout(30000);
console.log('depois de 30s:', await p.evaluate(() => ({ hunting: window.__G.hunting, monstro: window.__H.getCurrentMonster()?.name || null, pack: (window.__H.getCurrentPack()||[]).length })));
console.log('respostas /hunt/state (ultimas 8):');
states.slice(-8).forEach(s => console.log('  ', JSON.stringify(s)));
console.log('log:', await p.evaluate(() => [...document.getElementById('combat-log').children].slice(-5).map(n=>n.innerText.trim()).join(' // ')));
await b.close();
