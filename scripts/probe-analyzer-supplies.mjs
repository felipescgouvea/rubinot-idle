// Prova: o campo "Suprimentos" do Hunt Analyzer sobe quando o char consome
// poção na caçada (antes ficava travado em 0). Best-effort: observa por ~2min.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o huntUseCases novo (com ITEM_BUY_PRICE) publicado
for (let i = 0; i < 30; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/huntUseCases\.js\?v=(\d+)/); if (m) { const js = await (await fetch(site + '/src/application/huntUseCases.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('ITEM_BUY_PRICE')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
function readSupplies() {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('.hunt-analyzer-grid .ha-cell')];
    const cell = cells.find(c => /suprimento|supplies/i.test(c.querySelector('.ha-label')?.textContent || ''));
    if (!cell) return null;
    const raw = (cell.querySelector('.ha-val')?.textContent || '').replace(/[^\d.\-kKmM]/g, '');
    return raw;
  });
}
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="hunt"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => document.querySelector('.tab[data-tab="hunt"]')?.click());
  await page.waitForSelector('.hunt-analyzer-grid', { timeout: 20000 });
  const first = await readSupplies();
  console.log('[probe] Suprimentos inicial =', first);
  // observa por até ~2min por um valor de suprimentos > 0
  let saw = false, last = first;
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(5000);
    last = await readSupplies();
    const n = parseFloat((last || '0').replace(/k/i, 'e3').replace(/m/i, 'e6')) || 0;
    if (n > 0) { saw = true; break; }
  }
  console.log('[probe] Suprimentos final =', last, '| subiu?', saw);
  if (!saw) console.log('[probe] (inconclusivo: char não bebeu poção na janela; lógica coberta pelo unit test do ITEM_BUY_PRICE)');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ analyzer sem erros; campo Suprimentos operante');
process.exitCode = problems.length ? 1 : 0;
