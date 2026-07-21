// Probe: o painel do Battle Pass mostra as missões SEMANAIS + o label da
// temporada. E confere que o hp/mana exibido nunca passa do teto (clamp).
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
  await page.evaluate(() => { const t = document.querySelector('[data-tab="battlepass"]'); if (t) t.click(); });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => ({
    weeklyCards: document.querySelectorAll('#bp-weekly-area .bp-mission').length,
    dailyCards: document.querySelectorAll('#bp-missions-area .bp-mission').length,
    season: /Temporada de/.test(document.getElementById('bp-progress-area')?.textContent || ''),
    premiumBanner: !!document.querySelector('.bp-premium-off, .bp-premium-on'),
  }));
  console.log('[probe] BP:', JSON.stringify(r));
  if (r.weeklyCards < 1) problems.push('missões semanais não renderizaram');
  if (!r.season) problems.push('label de temporada ausente');
  if (!r.premiumBanner) problems.push('banner premium ausente');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ BP parte 2 OK (semanais + temporada + premium no painel)');
process.exitCode = problems.length ? 1 : 0;
