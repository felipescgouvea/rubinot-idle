// Probe: botões do topo/char + chrome da janela de batalha renderizam sprite?
// (elementos existem no DOM no boot mesmo escondidos — checa img.loaded direto)
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
  const want = ['daily','outfit','imbue','achievements','battle','log_combat','log_spells','log_supplies','log_loot'];
  const res = await page.evaluate((want) => want.map(id => {
    const el = document.querySelector(`[data-icon="${id}"]`);
    const img = el && el.querySelector('img');
    return { id, present: !!el, kind: img ? 'sprite' : (el ? 'emoji/none' : 'MISSING'), loaded: img ? (img.complete && img.naturalWidth > 0) : null };
  }), want);
  console.table(res);
  const good = res.filter(r => r.kind === 'sprite' && r.loaded);
  console.log(`[probe] ${good.length}/${res.length} elementos com sprite real carregada`);
  const bad = res.filter(r => !(r.kind === 'sprite' && r.loaded));
  if (bad.length) console.log('[probe] NÃO-sprite:', JSON.stringify(bad));
  // screenshot do topo (botões Settings/Daily)
  const hdr = await page.$('#header-btns');
  if (hdr) await hdr.screenshot({ path: join(ROOT, 'scripts', 'chrome-buttons.png') });
  ok = good.length === res.length;
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ botões + chrome da batalha com sprite real' : '❌ algo sem sprite');
process.exitCode = ok ? 0 : 1;
