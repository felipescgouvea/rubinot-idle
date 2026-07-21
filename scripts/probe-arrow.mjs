import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await login(p, acct); await instalarLiveImport(p);
await p.evaluate(async () => {
  const ts = await window.__liveImport('trainingStage.js');
  const h = document.createElement('div');
  h.id = 'ps'; h.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#222;padding:10px';
  document.body.appendChild(h);
  h.innerHTML = ts.trainingStageHtml('distance', null);
  ts.mountTrainingStagePlayer('distance');
});
await p.waitForTimeout(2500);
console.log(await p.evaluate(() => {
  const m = document.querySelector('#ps .tstage-missile');
  const st = document.querySelector('#ps .training-stage');
  const r = m.getBoundingClientRect();
  return {
    palco: `${Math.round(st.getBoundingClientRect().width)}x${Math.round(st.getBoundingClientRect().height)}`,
    spriteNatural: `${m.naturalWidth}x${m.naturalHeight}`,
    caixaCss: `${getComputedStyle(m).width} x ${getComputedStyle(m).height}`,
    proporcaoOk: Math.abs((parseFloat(getComputedStyle(m).width) / parseFloat(getComputedStyle(m).height)) - (m.naturalWidth / m.naturalHeight)) < 0.05,
  };
}));
const el = await p.$('#ps .training-stage');
if (el) await el.screenshot({ path: 'scripts/shot-arrow.png' });
await b.close();
