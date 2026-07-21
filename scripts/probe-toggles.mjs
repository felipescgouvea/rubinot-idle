// Probe: toggles de estilo de luta / densidade — sprite carregada E o toggle
// (classe .active) ainda funciona depois de virar sprite.
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
  const want = ['fm_attack','fm_balanced','fm_defense','dens_solo','dens_normal','dens_pack'];
  const sprites = await page.evaluate((want) => want.map(id => {
    const el = document.querySelector(`[data-icon="${id}"]`);
    const img = el && el.querySelector('img');
    return { id, kind: img ? 'sprite' : 'emoji/none', loaded: img ? (img.complete && img.naturalWidth > 0) : null };
  }), want);
  console.table(sprites);
  const good = sprites.filter(s => s.kind === 'sprite' && s.loaded);
  // testa o toggle: chama setFightMode/setDensity e confere .active
  const toggle = await page.evaluate(() => {
    const r = {};
    window.setFightMode('attack');
    r.fmActive = document.querySelector('.fight-mode-btn.active')?.dataset.mode;
    window.setDensity('pack');
    r.densActive = document.querySelector('.density-btn.active')?.dataset.mode;
    window.setFightMode('balanced'); window.setDensity('normal'); // restaura
    return r;
  });
  console.log('[probe] toggle:', JSON.stringify(toggle));
  // screenshot das duas linhas: força exibir o overlay da batalha
  await page.evaluate(() => { const o = document.getElementById('battle-modal-overlay'); if (o) o.style.display = 'flex'; });
  await page.waitForTimeout(300);
  const fmRow = await page.$('#fight-mode-row');
  const dRow = await page.$('#density-row');
  if (fmRow) await fmRow.screenshot({ path: join(ROOT, 'scripts', 'toggles-fm.png') });
  if (dRow) await dRow.screenshot({ path: join(ROOT, 'scripts', 'toggles-dens.png') });
  ok = good.length === want.length && toggle.fmActive === 'attack' && toggle.densActive === 'pack';
  console.log(`[probe] ${good.length}/${want.length} sprites | toggle ok=${toggle.fmActive === 'attack' && toggle.densActive === 'pack'}`);
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
console.log(ok ? '✅ toggles com sprite E funcionando' : '❌ problema');
process.exitCode = ok ? 0 : 1;
