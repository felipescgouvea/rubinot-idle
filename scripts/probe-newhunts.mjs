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
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  // Após o wipe, a conta não tem personagem — cria um druida.
  const needChar = await page.evaluate(() => !!document.getElementById('char-name-input'));
  console.log('[probe] precisa criar personagem:', needChar);
  if (needChar) {
    await page.fill('#char-name-input', 'RookHunter');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    await page.waitForTimeout(5000);
  }
  const voc = await page.evaluate(() => window.G && window.G.vocation);
  console.log('[probe] vocação:', voc);
  // Abre o seletor de zona → Rookgaard
  await page.evaluate(() => window.openZonePicker && window.openZonePicker());
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.openCity && window.openCity('rookgaard'));
  await page.waitForTimeout(1200);
  const zones = await page.evaluate(() => [...document.querySelectorAll('.zone-picker-gallery .zone-card .zone-card-name')].map(e => e.innerText));
  console.log('[probe] zonas em Rookgaard:', JSON.stringify(zones));
  // Testa iniciar a hunt de wolves
  await page.evaluate(() => window.pickZone && window.pickZone('wolf_den'));
  await page.waitForTimeout(9000);
  const log = await page.evaluate(() => document.getElementById('combat-log')?.innerText.split('\n').filter(Boolean).slice(-4));
  console.log('[probe] log wolf_den:', JSON.stringify(log));
  const active = await page.evaluate(() => window.G && window.G.activeZone);
  console.log('[probe] activeZone:', active);
  console.log('[probe] erros console:', errs.length ? JSON.stringify(errs.slice(0,3)) : 'nenhum');
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
