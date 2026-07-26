// Prova: clique-direito em criatura da Battle List e em item da mochila abre o
// menu custom (.ctx-menu) com as ações certas; o menu nativo é suprimido; 0 erros.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o main.js deployado importar contextMenu.js
for (let i = 0; i < 40; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/src\/main\.js\?v=(\d+)/);
    if (m) { const js = await (await fetch(site + '/src/main.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('wireContextMenu')) break; } } catch {}
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
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => { const b = document.getElementById('hunt-toggle'); if (b && /start|iniciar|caç/i.test(b.textContent)) b.click(); });
  await page.waitForSelector('.stage-monster', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // 1) clique-direito numa criatura
  await page.click('.stage-monster:not(.dead)', { button: 'right' });
  await page.waitForTimeout(400);
  const creatureMenu = await page.evaluate(() => {
    const m = document.querySelector('.ctx-menu:not([hidden])');
    if (!m) return null;
    return { items: [...m.querySelectorAll('.ctx-item')].map(b => b.textContent.trim()) };
  });
  console.log('[criatura]', JSON.stringify(creatureMenu));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-ctx-creature.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const closedAfterEsc = await page.evaluate(() => !document.querySelector('.ctx-menu:not([hidden])'));

  // 2) abre a mochila e clique-direito num item
  await page.evaluate(() => { if (window.toggleBackpack) window.toggleBackpack(); });
  await page.waitForTimeout(800);
  let itemMenu = null;
  if (await page.$('.inv-item')) {
    await page.click('.inv-item', { button: 'right' });
    await page.waitForTimeout(400);
    itemMenu = await page.evaluate(() => {
      const m = document.querySelector('.ctx-menu:not([hidden])');
      if (!m) return null;
      return { items: [...m.querySelectorAll('.ctx-item')].map(b => b.textContent.trim()) };
    });
    await page.screenshot({ path: join(ROOT, 'scripts', 'shot-ctx-item.png') });
  }
  console.log('[item]', JSON.stringify(itemMenu));

  if (!creatureMenu) problems.push('clique-direito na criatura NÃO abriu o menu custom');
  else {
    if (!creatureMenu.items.some(x => /Atacar|Attack/.test(x))) problems.push('menu da criatura sem "Atacar"');
    if (!creatureMenu.items.some(x => /Bestiário|Bestiary/.test(x))) problems.push('menu da criatura sem "Bestiário"');
  }
  if (!closedAfterEsc) problems.push('Escape não fechou o menu');
  if (itemMenu === null) problems.push('clique-direito no item NÃO abriu o menu custom (ou sem itens na bag)');
  else if (!itemMenu.items.some(x => /Examinar|Look/.test(x))) problems.push('menu do item sem "Examinar"');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ menu de contexto custom em criatura e item, fecha no Escape, 0 erros');
process.exitCode = problems.length ? 1 : 0;
