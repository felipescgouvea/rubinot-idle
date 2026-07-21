// E2e da buy offer: posta uma ordem de compra (reserva gold da carteira) e
// confere que ela aparece em "meus anúncios" e a carteira baixou.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const t = document.querySelector('[data-tab="market"]'); if (t) t.click(); });
  await page.waitForTimeout(3000);
  const setup = await page.evaluate(() => ({ hasBuyForm: !!document.getElementById('mk-buy-item'), hasBuySection: !!document.getElementById('mk-buy-offers') }));
  console.log('[probe] UI:', JSON.stringify(setup));
  if (!setup.hasBuyForm) problems.push('form de buy offer ausente');
  if (!setup.hasBuySection) problems.push('seção de ordens de compra ausente');
  if (setup.hasBuyForm) {
    // posta uma ordem: bones x5 a 50 = 250 reservado
    await page.evaluate(() => {
      const sel = document.getElementById('mk-buy-item');
      sel.value = 'bones';
      document.getElementById('mk-buy-qty').value = '5';
      document.getElementById('mk-buy-price').value = '50';
      window.postBuyOffer('bones', '5', '50');
    });
    await page.waitForTimeout(4000);
    const after = await page.evaluate(() => {
      const my = document.getElementById('mk-my-listings')?.textContent || '';
      const walletText = document.getElementById('skill-points-display')?.textContent || '';
      return { myHasBuy: /📥 compra/.test(my) && /Bones/i.test(my), walletText: walletText.slice(0, 120) };
    });
    console.log('[probe] após postar:', JSON.stringify(after));
    if (!after.myHasBuy) problems.push('buy offer não apareceu em "meus anúncios"');
  }
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Buy offer postada (aparece em meus anúncios)');
process.exitCode = problems.length ? 1 : 0;
