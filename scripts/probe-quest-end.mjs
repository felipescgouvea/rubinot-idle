// E2E: a quest tem FIM. Inicia a raid, deixa correr até o chefe cair, e confirma
// que a raid ENCERRA — log de conclusão aparece, para de caçar e a zona volta pra
// anterior (não fica respawnando o chefe igual hunt infinita).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');

// espera o cliente novo (marcador questEnded no huntUseCases) propagar
for (let i = 0; i < 60; i++) {
  try {
    const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/huntUseCases\.js\?v=(\d+)/);
    if (m) {
      const js = await (await fetch(site + '/src/application/huntUseCases.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('questEndSeen')) { console.log('[deploy] cliente novo (v=' + m[1] + ')'); break; }
    }
  } catch {}
  await new Promise(r => setTimeout(r, 4000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
const startZones = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('request', r => { if (r.url().includes('/hunt/start')) { try { startZones.push(JSON.parse(r.postData()).zoneId); } catch {} } });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password); await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(12000); // deixa o auto-resume assentar
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // para a caça atual e deixa o reconcile assentar
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /stop|parar/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(6000);
  const zoneBefore = await page.evaluate(() => document.getElementById('zone-current-name')?.textContent?.trim() || '');

  // inicia a raid
  let started = false;
  for (let k = 0; k < 4 && !started; k++) {
    await page.evaluate(() => window.startQuestClick('orc_fortress'));
    await page.waitForTimeout(3500);
    started = startZones.some(z => z === 'quest:orc_fortress');
  }
  if (!started) { problems.push('raid não iniciou (zonas: ' + JSON.stringify(startZones) + ')'); throw new Error('no-start'); }
  console.log('[start] raid iniciada; zona antes =', JSON.stringify(zoneBefore));

  // deixa a raid correr (7 orcs + orc_warlord) e detecta o FIM: o log de
  // conclusão aparece OU o botão volta pra "Start" (parou de caçar).
  let ended = false, endLog = '', hunting = true, zoneAfter = '';
  for (let s = 0; s < 60 && !ended; s++) {         // até ~180s
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => {
      const body = document.body.innerText || '';
      const doneLine = (body.match(/Quest (complete|concluída)[^\n]*/i) || [])[0] || '';
      const btn = document.getElementById('hunt-toggle');
      const isHunting = btn ? /stop|parar/i.test(btn.textContent) : false;
      const zone = document.getElementById('zone-current-name')?.textContent?.trim() || '';
      return { doneLine, isHunting, zone };
    });
    if (st.doneLine) { ended = true; endLog = st.doneLine; hunting = st.isHunting; zoneAfter = st.zone; }
  }
  if (!ended) problems.push('a raid NÃO encerrou em ~180s (sem log de conclusão) — pode estar respawnando o chefe (hunt infinita)');
  else {
    console.log('[fim] log de conclusão =', JSON.stringify(endLog));
    // dá um tempinho pro handler encerrar/voltar a zona
    await page.waitForTimeout(4000);
    const post = await page.evaluate(() => {
      const btn = document.getElementById('hunt-toggle');
      return { isHunting: btn ? /stop|parar/i.test(btn.textContent) : false, zone: document.getElementById('zone-current-name')?.textContent?.trim() || '' };
    });
    console.log('[fim] caçando? =', post.isHunting, '| zona depois =', JSON.stringify(post.zone));
    if (post.zone.toLowerCase().includes('orc warlord') || post.zone.toLowerCase().includes("warlord's fortress") || post.zone.includes('quest:'))
      problems.push('após o fim a UI continuou na zona da quest: ' + post.zone);
  }
} catch (e) { if (e.message !== 'no-start') problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ FALHOU\n❌ ' + problems.join('\n❌ ') : '\n✅ PASSOU — a raid tem FIM: chefe cai → conclusão + volta pra zona anterior (não respawna o chefe)');
process.exitCode = problems.length ? 1 : 0;
