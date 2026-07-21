// Probe: as abas de navegação renderizam a sprite pixel-art real (img.tab-icon)
// em vez do emoji do SO? Confere quantas viraram <img> vs quantas caíram no
// fallback <span>, e tira um screenshot da barra de abas pra conferência visual.
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
  await page.waitForTimeout(6000);
  // dá tempo das sprites carregarem
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.tab[data-icon]'));
    const rows = tabs.map(t => {
      const img = t.querySelector('img.tab-icon');
      const span = t.querySelector('span.tab-icon');
      return {
        tab: t.dataset.icon,
        kind: img ? 'sprite' : (span ? 'emoji-fallback' : 'none'),
        src: img ? img.getAttribute('src') : null,
        loaded: img ? (img.complete && img.naturalWidth > 0) : null,
      };
    });
    return rows;
  });
  console.table(res);
  const sprites = res.filter(r => r.kind === 'sprite' && r.loaded);
  console.log(`[probe] ${sprites.length}/${res.length} abas com sprite real carregada`);
  const bad = res.filter(r => r.kind !== 'sprite' || !r.loaded);
  if (bad.length) console.log('[probe] NÃO-sprite:', JSON.stringify(bad));
  // screenshot da barra de abas
  const nav = await page.$('#tabs');
  if (nav) await nav.screenshot({ path: join(ROOT, 'scripts', 'tabicons.png') });
  ok = sprites.length === res.length;
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ todas as abas com sprite pixel-art real' : '❌ alguma aba sem sprite');
process.exitCode = ok ? 0 : 1;
