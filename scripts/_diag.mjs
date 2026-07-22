import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
p.on('dialog', d => d.accept());
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await login(p, acct);
await instalarLiveImport(p);
const ativo = await p.evaluate(async () => (await window.__liveImport('gameStore.js')).ACCOUNT.activeSlot);
if (ativo !== 1) { await p.evaluate(async () => (await window.__liveImport('accountUseCases.js')).confirmSwitchCharacterSlot(1)); await esperarReload(p); await instalarLiveImport(p); }
await p.evaluate(() => window.openBattleModal && window.openBattleModal());
await p.evaluate(async () => { const rtc = await window.__liveImport('rtcUseCases.js'); rtc.setRtcAttackSpellSlot(0, 'exori', 'spell'); });

await p.evaluate(() => {
  window.__tiles = [];
  const stage = document.getElementById('dungeon-stage');
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) {
    if (n.classList && n.classList.contains('combat-area-tile')) {
      const sr = stage.getBoundingClientRect(); const r = n.getBoundingClientRect();
      window.__tiles.push({ x: Math.round(r.left - sr.left), y: Math.round(r.top - sr.top), w: Math.round(r.width), h: Math.round(r.height), palcoW: Math.round(sr.width), palcoH: Math.round(sr.height) });
    }
  } }).observe(stage, { childList: true });
});
await p.evaluate(async () => {
  window.__manaTop = setInterval(() => { if (window.__G) window.__G.mana = 9999; }, 300);
  window.__G.density = 'pack'; window.__H.selectZone('kongra_hunt');
  await new Promise(r => setTimeout(r, 800)); await window.__H.startHunt();
});
await p.waitForTimeout(20000);
await p.evaluate(() => clearInterval(window.__manaTop));
const t = await p.evaluate(() => window.__tiles);
if (t.length) {
  const sr = t[0];
  console.log(`palco ${sr.palcoW}x${sr.palcoH} · ${t.length} tiles`);
  console.log('primeiros 9 (uma salva):');
  t.slice(0, 9).forEach(x => console.log(`  x ${x.x}..${x.x + x.w} · y ${x.y}..${x.y + x.h} · ${x.w}x${x.h}` + ((x.x + x.w < 0 || x.x > x.palcoW || x.y + x.h < 0 || x.y > x.palcoH) ? '  <-- FORA' : '')));
}
await b.close();
