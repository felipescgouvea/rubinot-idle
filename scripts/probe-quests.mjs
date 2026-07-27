// E2E Quests: inicia a raid (confirma que o /hunt/start mandou a zona de quest)
// e deixa correr. A CONCLUSÃO (prêmio + completed_quests) é verificada no banco.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 50; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/questsPanel\.js\?v=(\d+)/);
    if (m) { const js = await (await fetch(site + '/src/ui/questsPanel.js?v=' + m[1], { cache: 'no-store' })).text(); if (js.includes('wasHunting')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = []; const starts = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('request', r => { if (r.url().includes('/hunt/start')) { try { starts.push(JSON.parse(r.postData()).zoneId); } catch {} } });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password); await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(12000); // deixa o auto-resume do login TERMINAR (starting=false)
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => document.querySelector('.tab[data-tab="quests"]')?.click());
  await page.waitForSelector('.quest-card', { timeout: 12000 });
  const cardCount = await page.evaluate(() => document.querySelectorAll('.quest-card').length);
  // para a caça atual (auto-resume) e deixa o reconcile assentar, pra a quest
  // arrancar sem corrida
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /stop|parar/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(6000);
  starts.length = 0;
  let questStart = null;
  for (let k = 0; k < 4 && !questStart; k++) {
    await page.evaluate(() => window.startQuestClick('orc_fortress'));
    await page.waitForTimeout(3500);
    questStart = starts.find(z => z === 'quest:orc_fortress');
  }
  console.log('[start] cards:', cardCount, '| /hunt/start zones:', JSON.stringify(starts));
  // deixa a raid correr (mata ~7 orcs, depois o orc_warlord garantido)
  await page.waitForSelector('.stage-monster', { timeout: 20000 });
  await page.waitForTimeout(105000);
  if (cardCount !== 3) problems.push(`esperava 3 quests, veio ${cardCount}`);
  if (!questStart) problems.push('startQuestClick NÃO mandou zona de quest (mandou: ' + JSON.stringify(starts) + ')');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ raid iniciada na zona de quest; rodou 105s (conferir conclusão no banco)');
process.exitCode = problems.length ? 1 : 0;
