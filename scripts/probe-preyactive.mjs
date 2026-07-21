import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 700 } });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  await page.click('.tab[data-tab="bestiary"]'); await page.waitForTimeout(1000);
  // abre o modal de escolha da presa no slot 1
  await page.evaluate(() => window.openPreySelect(0));
  await page.waitForTimeout(500);
  const picks = await page.$$('.prey-pick');
  console.log('[probe] criaturas encontradas p/ prey:', picks.length);
  if (picks.length) {
    await picks[0].click();               // ativa a presa slot 0
    await page.waitForTimeout(800);
    const active = await page.$('.prey-card.active');
    if (active) await active.screenshot({ path: join(ROOT, 'scripts', 'panel-prey-active.png') });
    console.log('[probe] active card:', !!active);
    await page.evaluate(() => window.clearPrey(0));  // RESTAURA a conta de teste
    await page.waitForTimeout(500);
    const stillActive = await page.evaluate(() => document.querySelectorAll('.prey-card.active').length);
    console.log('[probe] restaurado (0 esperado):', stillActive);
  } else {
    // fecha o modal
    await page.evaluate(() => window.closeModal());
    console.log('[probe] conta de teste sem criaturas encontradas — nao da pra mostrar prey ativa');
  }
} catch (e) { console.log('EX', e.message); }
finally { await browser.close(); }
