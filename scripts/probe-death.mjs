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
    await page.fill('#char-name-input', 'DeathProbe');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    await page.waitForTimeout(5000);
  }
  await page.evaluate(() => window.pickZone && window.pickZone('livraria_earth'));
  console.log('[probe] caçando zona letal, esperando morrer...');
  // espera morrer (hunt para sozinho na morte)
  let died = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const hunting = await page.evaluate(() => document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'));
    if (!hunting) { died = true; console.log(`[probe] parou de caçar (morreu?) em ~${i}s`); break; }
  }
  console.log('[probe] morreu:', died);
  // Agora PARADO — observa se o HP recupera no display por 18s
  const samples = [];
  for (let i = 0; i < 18; i++) {
    const s = await page.evaluate(() => ({
      battleHp: document.getElementById('player-hp-label')?.textContent,
      hdrHp: document.getElementById('hdr-hp')?.textContent,
      hunting: document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'),
    }));
    samples.push(`${i}s: batalha=${s.battleHp} hdr=${s.hdrHp} hunt=${s.hunting}`);
    await page.waitForTimeout(1000);
  }
  console.log('[probe] HP PARADO após morte:');
  samples.forEach(s => console.log('  ' + s));
  const uniq = new Set(samples.map(s => s.split('batalha=')[1]?.split(' ')[0]));
  console.log('[probe] valores distintos de HP batalha após morte:', uniq.size, JSON.stringify([...uniq]));
  console.log('[probe] erros:', errs.length ? JSON.stringify(errs.slice(0,5)) : 'nenhum');
} catch (e) { console.log('ERRO', e.message); console.log('errs:', JSON.stringify(errs.slice(0,5))); }
finally { await browser.close(); }
