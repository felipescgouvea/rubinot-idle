import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  const needChar = await page.evaluate(() => !!document.getElementById('char-name-input'));
  console.log('[probe] tela de criação:', needChar);
  if (needChar) {
    await page.fill('#char-name-input', 'PalTest');
    await page.evaluate(() => window.createCharacter && window.createCharacter('paladin'));
    await page.waitForTimeout(6000);
    console.log('[probe] paladino criado');
  } else {
    console.log('[probe] JÁ TEM personagem — não recriou (verificar limpeza)');
  }
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
