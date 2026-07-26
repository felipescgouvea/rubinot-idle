// Prova: clique-direito (evento contextmenu) em criatura do palco e em item da
// mochila abre o menu custom (.ctx-menu) com as ações certas e SUPRIME o nativo
// (defaultPrevented); Escape fecha; 0 erros. Contra produção.
// Usa dispatch determinístico do evento contextmenu (o mapeamento clique-real→
// evento é do navegador, não do nosso código; o handler é o que verificamos) —
// o clique-direito sintético do Playwright é instável com sprites animando.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 45; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/ui\/contextMenu\.js\?v=(\d+)/);
    if (m) { const js = await (await fetch(site + '/src/ui/contextMenu.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('stage-monster') && js.includes('find(v => v')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
async function rightClick(selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    el.dispatchEvent(ev);
    const menu = document.querySelector('.ctx-menu:not([hidden])');
    return { found: true, prevented: ev.defaultPrevented, items: menu ? [...menu.querySelectorAll('.ctx-item')].map(b => b.textContent.trim()) : null };
  }, selector);
}
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#dungeon-stage', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /start|iniciar|caç/i.test(b.textContent)) b.click(); });
  await page.waitForSelector('.stage-monster', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const creature = await rightClick('.stage-monster:not(.dead)');
  console.log('[criatura]', JSON.stringify(creature));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-ctx-creature.png') });
  const closedAfterEsc = await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return !document.querySelector('.ctx-menu:not([hidden])'); });

  await page.evaluate(() => { if (window.toggleBackpack) window.toggleBackpack(); });
  await page.waitForTimeout(800);
  const item = (await page.$('.inv-item')) ? await rightClick('.inv-item') : { found: false };
  console.log('[item]', JSON.stringify(item));
  if (item.found) await page.screenshot({ path: join(ROOT, 'scripts', 'shot-ctx-item.png') });

  if (!creature.found) problems.push('sem .stage-monster pra testar');
  else {
    if (!creature.prevented) problems.push('menu nativo NÃO suprimido na criatura (defaultPrevented=false)');
    if (!creature.items) problems.push('menu da criatura não abriu');
    else {
      if (!creature.items.some(x => /Atacar|Attack/.test(x))) problems.push('menu da criatura sem "Atacar"');
      if (!creature.items.some(x => /Bestiário|Bestiary/.test(x))) problems.push('menu da criatura sem "Bestiário"');
    }
  }
  if (!closedAfterEsc) problems.push('Escape não fechou o menu');
  if (!item.found) problems.push('sem item na mochila pra testar');
  else if (!item.items) problems.push('menu do item não abriu');
  else if (!item.items.some(x => /Examinar|Look/.test(x))) problems.push('menu do item sem "Examinar"');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ menu de contexto custom: criatura (Atacar/Bestiário) e item (Examinar), nativo suprimido, Escape fecha, 0 erros');
process.exitCode = problems.length ? 1 : 0;
