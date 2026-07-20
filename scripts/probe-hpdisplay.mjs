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
  const needChar = await page.evaluate(() => !!document.getElementById('char-name-input'));
  if (needChar) {
    await page.fill('#char-name-input', 'HpProbe');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    await page.waitForTimeout(5000);
  }
  // Começa a caçar (zona fácil)
  await page.evaluate(() => window.pickZone && window.pickZone('rat_cave'));
  await page.waitForTimeout(2000);
  // Observa o HP label da janela de batalha por 20s
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => ({
      battleHp: document.getElementById('player-hp-label')?.textContent,
      battleMana: document.getElementById('player-mana-label')?.textContent,
      hdrHp: document.getElementById('hdr-hp')?.textContent,
      hunting: document.getElementById('hdr-hunt-status')?.textContent?.includes('🟢'),
    }));
    samples.push(`${s.battleHp} | mana ${s.battleMana} | hdr ${s.hdrHp} | hunt=${s.hunting}`);
    await page.waitForTimeout(1000);
  }
  console.log('[probe] HP label ao longo de 20s:');
  samples.forEach((s,i) => console.log(`  ${i}s: ${s}`));
  const uniq = new Set(samples.map(s => s.split('|')[0].trim()));
  console.log('[probe] valores distintos de battleHp:', uniq.size, '→', JSON.stringify([...uniq].slice(0,10)));
  console.log('[probe] erros console:', errs.length ? JSON.stringify(errs.slice(0,5)) : 'nenhum');
} catch (e) { console.log('ERRO', e.message); console.log('errs:', JSON.stringify(errs.slice(0,5))); }
finally { await browser.close(); }
