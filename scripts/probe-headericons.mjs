// Probe: os cabeçalhos de painel (.card h3[data-icon]) renderizam sprite real?
// Varre todas as abas, confere img.hdr-icon carregada em cada h3, e tira
// screenshots do painel Hunt e do Bestiary pra conferência visual.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  // clica em cada aba pra garantir que o painel exista/renderize
  const tabs = await page.$$eval('.tab[data-tab]', els => els.map(e => e.dataset.tab));
  for (const t of tabs) {
    const btn = await page.$(`.tab[data-tab="${t}"]`);
    if (btn) { await btn.click().catch(() => {}); await page.waitForTimeout(120); }
  }
  await page.click('.tab[data-tab="hunt"]');
  await page.waitForTimeout(1200);
  const res = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h3[data-icon]')).map(h => {
      const img = h.querySelector('img.hdr-icon');
      const span = h.querySelector('span.hdr-icon');
      return {
        icon: h.dataset.icon,
        kind: img ? 'sprite' : (span ? 'emoji' : 'none'),
        loaded: img ? (img.complete && img.naturalWidth > 0) : null,
      };
    });
  });
  console.table(res);
  const good = res.filter(r => r.kind === 'sprite' && r.loaded);
  console.log(`[probe] ${good.length}/${res.length} cabeçalhos com sprite real carregada`);
  const bad = res.filter(r => !(r.kind === 'sprite' && r.loaded));
  if (bad.length) console.log('[probe] NÃO-sprite:', JSON.stringify(bad));
  const hunt = await page.$('#tab-hunt');
  if (hunt) await hunt.screenshot({ path: join(ROOT, 'scripts', 'hdr-hunt.png') });
  await page.click('.tab[data-tab="bestiary"]'); await page.waitForTimeout(800);
  const best = await page.$('#tab-bestiary');
  if (best) await best.screenshot({ path: join(ROOT, 'scripts', 'hdr-bestiary.png') });
  ok = good.length === res.length && res.length >= 20;
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ todos os cabeçalhos com sprite real' : '❌ algum cabeçalho sem sprite');
process.exitCode = ok ? 0 : 1;
