// Probe: a aba Market renderiza com a nota de taxa (🏛️ 5%) e sem erros; se o
// item tiver histórico, o stats aparece. Lenient (aceita a tela de registro).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [], errs = [];
page.on('pageerror', e => errs.push((e.message || String(e)).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  // vai pra aba Market
  await page.evaluate(() => { const t = document.querySelector('[data-tab="market"]'); if (t) t.click(); });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const c = document.getElementById('market-content');
    const txt = c ? c.textContent : '';
    return { hasFee: /🏛️|taxa da casa/.test(txt), hasRegister: !!document.getElementById('mk-name-input'), hasSellForm: !!document.getElementById('mk-sell-item'), len: txt.length };
  });
  console.log('[probe] market:', JSON.stringify(r));
  if (r.hasSellForm && !r.hasFee) problems.push('form de venda sem a nota de taxa');
  if (!r.hasSellForm && !r.hasRegister) problems.push('aba Market não renderizou (nem form nem registro)');
  // se tem form, testa o stats de um item
  if (r.hasSellForm) {
    const stats = await page.evaluate(async () => {
      const sel = document.getElementById('mk-sell-item');
      if (!sel || !sel.value) return 'sem itens';
      await window.showMarketStats(sel.value);
      await new Promise(r => setTimeout(r, 1500));
      return document.getElementById('mk-sell-stats')?.textContent;
    });
    console.log('[probe] stats do 1º item:', JSON.stringify(stats));
    if (!/📊/.test(stats || '')) problems.push('stats de preço não renderizou');
  }
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
if (errs.length) problems.push('erros: ' + errs.slice(0, 3).join(' | '));
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Market renderiza (taxa + stats) sem erros');
process.exitCode = problems.length ? 1 : 0;
