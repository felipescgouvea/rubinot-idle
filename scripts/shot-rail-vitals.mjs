// Screenshot do rail de vitais (HP/MP/XP) mostrando a cor-de-canal por vital.
// Coloca as barras em % parcial (demo) pra revelar a tinta na parte vazia, e
// captura nos dois temas (claro/escuro).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const OUT = process.argv[2] || ROOT;

// espera o style.css novo (com a regra .row-hp)
const url = `${acct.site.replace(/\/$/, '')}/style.css?v=335`;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('1.5px #e74c3c')) break; } catch {}
  await new Promise(r => setTimeout(r, 4000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 2 });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);

  // demo: barras parciais pra revelar a tinta da parte vazia
  await page.evaluate(() => {
    const set = (id, w, cls) => { const b = document.getElementById(id); if (b) { b.style.width = w; if (cls) { b.classList.remove('hp-state-high','hp-state-mid','hp-state-low'); b.classList.add(cls); } } };
    set('hp-bar', '58%', 'hp-state-mid');   // HP "mid" = laranja (o caso que confundia com XP)
    set('mana-bar', '42%');
    set('xp-bar', '30%');
    const t = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    t('hp-text', '1160/2000'); t('mana-text', '840/2000'); t('xp-text', '30%');
  });
  await page.waitForTimeout(300);

  const bars = page.locator('.char-status-bars').first();
  await bars.screenshot({ path: join(OUT, 'rail-light.png') });

  await page.evaluate(() => window.toggleTheme && window.toggleTheme());
  await page.waitForTimeout(400);
  await bars.screenshot({ path: join(OUT, 'rail-dark.png') });

  console.log('OK: rail-light.png + rail-dark.png');
} catch (e) { console.log('ERRO:', e.message); process.exitCode = 1; }
finally { await browser.close(); }
