// Prova: botão Store no topbar abre a aba Shop; botão Imbue sumiu do card do
// personagem (rail-actions). Contra produção (github.io).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o index.html publicado conter o store-btn
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(site + '/index.html', { cache: 'no-store' }); if (r.ok && (await r.text()).includes('id="store-btn"')) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  if (!deployed) problems.push('deploy não publicou o store-btn a tempo');
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });

  const out = await page.evaluate(() => {
    const store = document.getElementById('store-btn');
    const imbueInCard = !!document.querySelector('#char-info .rail-actions button[onclick*="openImbueModal"]');
    return {
      storeExists: !!store,
      storeLabel: store?.textContent?.trim(),
      imbueInCard,
    };
  });
  // clica no Store e confere que a aba shop ficou ativa
  await page.click('#store-btn');
  await page.waitForTimeout(800);
  const shopActive = await page.evaluate(() => document.querySelector('.tab[data-tab="shop"]')?.classList.contains('active') || document.body.dataset.tab === 'shop');
  console.log('[probe]', JSON.stringify({ ...out, shopActive }));
  if (!out.storeExists) problems.push('botão Store não existe no topbar');
  if (out.storeLabel !== 'Store') problems.push('rótulo do Store != "Store" (' + out.storeLabel + ')');
  if (out.imbueInCard) problems.push('botão Imbue ainda está no card do personagem');
  if (!shopActive) problems.push('clicar Store não abriu a aba Shop');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Store no header abre a Loja; Imbue removido do card; 0 erros');
process.exitCode = problems.length ? 1 : 0;
