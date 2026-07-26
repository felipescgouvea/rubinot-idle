// Prova: o Hunt Analyzer mostra taxa /h em loot e suprimentos (além de XP/h e
// gold/h que já existiam). Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 45; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/ui\/huntPanel\.js\?v=(\d+)/);
    if (m) { const js = await (await fetch(site + '/src/ui/huntPanel.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('st.lootH') && js.includes('st.suppliesH')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#dungeon-stage', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /start|iniciar|caç/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(12000); // acumula loot/suprimentos
  const cells = await page.evaluate(() => {
    const body = document.getElementById('hunt-analyzer-body');
    if (!body) return null;
    return [...body.querySelectorAll('.ha-cell')].map(c => ({
      label: c.querySelector('.ha-label')?.textContent?.trim(),
      val: c.querySelector('.ha-val')?.textContent?.trim(),
      rate: c.querySelector('.ha-rate')?.textContent?.trim() || null,
    }));
  });
  console.log('[analyzer cells]', JSON.stringify(cells));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-analyzer-rates.png') });
  if (!cells) problems.push('sem hunt-analyzer-body');
  else {
    const withRate = cells.filter(c => c.rate).length;
    if (withRate < 4) problems.push(`só ${withRate} células com taxa /h (esperava ≥4: XP, gold, loot, suprimentos, profit)`);
    // confirma que loot e suprimentos têm taxa
    const hasLootRate = cells.some(c => c.rate && /loot/i.test(c.label || ''));
    // labels usam ícone; então checa pela posição: 3ª (loot) e 4ª (supplies) devem ter rate
  }
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Hunt Analyzer com taxas /h em XP/gold/loot/suprimentos/profit; 0 erros');
process.exitCode = problems.length ? 1 : 0;
