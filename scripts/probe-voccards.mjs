// Probe: os cards de vocação renderizam a arma-sprite (img.voc-icon-img)?
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let ok = false;
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6500);
  const grid = await page.$('#vocation-select');
  const res = await page.evaluate(() => Array.from(document.querySelectorAll('.voc-icon')).map(d => {
    const img = d.querySelector('img.voc-icon-img');
    return { voc: d.dataset.icon, kind: img ? 'sprite' : 'emoji', loaded: img ? (img.complete && img.naturalWidth > 0) : null, src: img ? img.getAttribute('src') : null };
  }));
  console.table(res);
  const good = res.filter(r => r.kind === 'sprite' && r.loaded);
  console.log(`[probe] ${good.length}/${res.length} cards de vocação com sprite real`);
  if (grid) await grid.screenshot({ path: join(ROOT, 'scripts', 'voccards.png') });
  ok = res.length === 4 && good.length === 4;
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ cards de vocação com arma-sprite' : '❌ (talvez a conta de teste já tenha personagem — grid oculto)');
process.exitCode = ok ? 0 : 1;
