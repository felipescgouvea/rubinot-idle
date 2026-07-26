// Prova: o wrap do monstro NÃO tem mais o bob sintético (animationName 'none'),
// e a sprite (WebP animada) continua animando nativamente (pixels mudam entre
// dois instantes). Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o style.css novo (sem @keyframes monster-walk)
for (let i = 0; i < 30; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/style\.css\?v=(\d+)/); if (m) { const css = await (await fetch(site + '/style.css?v=' + m[1], { cache: 'no-store' })).text();
      if (css.includes('removido @keyframes monster-walk')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="hunt"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => document.querySelector('.tab[data-tab="hunt"]')?.click());
  // espera aparecer um monstro no palco
  await page.waitForSelector('.monster-sprite-wrap img.monster-sprite', { timeout: 30000 });
  await page.waitForTimeout(1500);
  // Nenhum wrap pode ter o bob 'monster-walk'. death/hit/spawn são efeitos
  // legítimos que o Felipe quer manter — só o bob constante saiu.
  const animInfo = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.monster-sprite-wrap')];
    const names = wraps.map(w => getComputedStyle(w).animationName);
    const idle = wraps.find(w => !w.className.match(/dying|dead|hit|spawning/));
    return { names, hasWalk: names.includes('monster-walk'), idleName: idle ? getComputedStyle(idle).animationName : null };
  });
  const animName = animInfo.hasWalk ? 'monster-walk' : (animInfo.idleName ?? 'none');
  // diff de pixels da sprite entre dois instantes (native webp anim). Usa clip
  // por bounding box (robusto a re-render do palco a cada tick).
  const box = await page.evaluate(() => {
    const im = document.querySelector('.monster-sprite-wrap img.monster-sprite');
    if (!im) return null; const r = im.getBoundingClientRect();
    return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });
  if (!box || box.width < 4) throw new Error('sem bounding box do monstro');
  const a = await page.screenshot({ clip: box });
  await page.waitForTimeout(700);
  const b = await page.screenshot({ clip: box });
  const differ = Buffer.compare(a, b) !== 0;
  console.log('[probe]', JSON.stringify({ animName, spriteBytesDiffer: differ, aLen: a.length, bLen: b.length }));
  if (animName !== 'none') problems.push('monster-sprite-wrap ainda tem animação CSS: ' + animName);
  if (!differ) problems.push('sprite NÃO mudou entre 2 frames — animação nativa pode ter congelado (revisar)');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ bob sintético removido (animationName none) + sprite anima nativamente; 0 erros');
process.exitCode = problems.length ? 1 : 0;
