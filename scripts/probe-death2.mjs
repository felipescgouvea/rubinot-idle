import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(5000);
  const needChar = await page.evaluate(() => { const el = document.getElementById('char-name-input'); return !!(el && el.offsetParent !== null); });
  if (needChar) {
    await page.fill('#char-name-input', 'DeathClean');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    await page.waitForTimeout(5000);
  }
  await page.evaluate(() => window.pickZone && window.pickZone('livraria_earth'));
  let died = false;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const hunting = await page.evaluate(() => document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
    if (!hunting) { died = true; break; }
  }
  console.log('[probe] morreu:', died);
  // Garante idle: se resumiu, para de novo
  await page.waitForTimeout(500);
  const stillHunting = await page.evaluate(() => document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
  if (stillHunting) { await page.evaluate(() => window.toggleHunt && window.toggleHunt()); console.log('[probe] forcei parar (tinha resumido)'); }
  const samples = [];
  for (let i = 0; i < 16; i++) {
    const s = await page.evaluate(() => ({
      hp: document.getElementById('player-hp-label')?.textContent,
      hunt: document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'),
    }));
    samples.push(`${i}s: hp=${s.hp} hunt=${s.hunt}`);
    await page.waitForTimeout(1000);
  }
  console.log('[probe] HP parado após morte (conta limpa):');
  samples.forEach(s => console.log('  ' + s));
  const hpvals = samples.map(s => parseFloat(s.split('hp=')[1]));
  const climbed = hpvals[hpvals.length-1] > hpvals[2];
  console.log('[probe] HP subiu?', climbed, `(${hpvals[2]} → ${hpvals[hpvals.length-1]})`);
  const frac = samples.some(s => /\.\d/.test(s.split('hp=')[1]||''));
  console.log('[probe] tem fração?', frac);
  console.log('[probe] erros:', errs.length ? JSON.stringify(errs.slice(0,4)) : 'nenhum');
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
