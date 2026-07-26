// Prova: barra de vida/mana FLUTUA sobre o boneco no palco (acima da sprite),
// as barras preenchem com valores reais, NÃO há HP/Mana duplicados abaixo do
// palco (só o XP resta lá), 0 erros. Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o style.css deployado conter o marcador novo
for (let i = 0; i < 40; i++) {
  try {
    const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/);
    if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('.player-overhead')) break; }
  } catch {}
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
  // inicia a caça pra popular vida/mana
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /start|iniciar|caç/i.test(b.textContent)) b.click(); });
  await page.waitForTimeout(3500);

  const r = await page.evaluate(() => {
    const stage = document.getElementById('dungeon-stage');
    const oh = document.getElementById('player-overhead');
    const sprite = document.getElementById('player-sprite-wrap');
    const hpL = document.getElementById('player-hp-label')?.textContent?.trim();
    const mpL = document.getElementById('player-mana-label')?.textContent?.trim();
    const ohInStage = !!(oh && stage && stage.contains(oh));
    const or = oh?.getBoundingClientRect(); const sr = sprite?.getBoundingClientRect();
    const aboveSprite = or && sr ? (or.bottom <= sr.top + 6) : false;
    // conta HP/Mana tracks ABAIXO do palco (fora do stage): devem ser 0
    const scene = document.getElementById('battle-scene');
    let dupHpMana = 0;
    if (scene) for (const el of scene.querySelectorAll('.player-hp-track')) {
      if (stage.contains(el)) continue;                 // overhead (dentro do palco) ok
      if (el.classList.contains('player-xp-track')) continue; // XP pode ficar abaixo
      dupHpMana++;
    }
    return { ohInStage, aboveSprite, hpL, mpL, dupHpMana };
  });
  console.log('[overhead]', JSON.stringify(r));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-player-overhead.png') });

  if (!r.ohInStage) problems.push('#player-overhead não está dentro do #dungeon-stage');
  if (!r.aboveSprite) problems.push('overhead não está ACIMA da sprite do boneco');
  if (!r.hpL || /--/.test(r.hpL)) problems.push('label de vida não preencheu: ' + r.hpL);
  if (!r.mpL || /--/.test(r.mpL)) problems.push('label de mana não preencheu: ' + r.mpL);
  if (r.dupHpMana > 0) problems.push('ainda há ' + r.dupHpMana + ' barra(s) HP/Mana duplicada(s) abaixo do palco');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ HP/Mana flutuam sobre o boneco, preenchem, sem duplicata abaixo; 0 erros');
process.exitCode = problems.length ? 1 : 0;
