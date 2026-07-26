// Prova a11y do modal: role=dialog no #modal-box; Escape fecha; Escape no detalhe
// aberto da Bag volta pra Bag (mesmo caminho do Close); 0 erros.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const url = `${acct.site.replace(/\/$/, '')}/src/ui/shared.js?v=329`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('modalOpener')) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  if (!deployed) problems.push('deploy não publicou shared.js a11y a tempo');
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });

  const role = await page.getAttribute('#modal-box', 'role');
  // 1) modal simples: abre a Bag, Escape fecha
  await page.evaluate(() => window.toggleBackpack());
  await page.waitForTimeout(200);
  const openBag = await page.evaluate(() => getComputedStyle(document.getElementById('modal-overlay')).display !== 'none');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const afterEsc = await page.evaluate(() => getComputedStyle(document.getElementById('modal-overlay')).display !== 'none');
  // 2) Escape no detalhe aberto DA BAG → volta pra Bag (overlay continua aberto,
  //    mostrando a bag). Abro direto via openItemModal(id, true) pra ser determinístico.
  const nested = await page.evaluate(() => {
    if (window.closeModal) window.closeModal();
    window.openItemModal('arrow', true); // fromBag=true
    return getComputedStyle(document.getElementById('modal-overlay')).display !== 'none';
  });
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const backToBag = await page.evaluate(() => ({
    overlay: getComputedStyle(document.getElementById('modal-overlay')).display !== 'none',
    bag: !!document.querySelector('#modal-content #inventory-grid'),
  }));
  await page.keyboard.press('Escape'); // fecha a bag

  console.log('[probe] role:', role, '| bag abriu:', openBag, '| Escape fechou simples:', !afterEsc, '| detalhe abriu:', nested, '| Escape detalhe→bag:', JSON.stringify(backToBag));
  if (role !== 'dialog') problems.push(`#modal-box sem role=dialog (veio ${role})`);
  if (!openBag) problems.push('bag não abriu');
  if (afterEsc) problems.push('Escape não fechou o modal simples');
  if (!nested) problems.push('detalhe do item não abriu (teste inconclusivo)');
  else if (!backToBag.overlay || !backToBag.bag) problems.push('Escape no detalhe da Bag NÃO voltou pra Bag: ' + JSON.stringify(backToBag));
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Modal a11y OK: role=dialog, Escape fecha, Escape no detalhe volta pra Bag, 0 erros');
process.exitCode = problems.length ? 1 : 0;
