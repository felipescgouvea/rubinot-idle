// Prova: Fechar/clique-fora no detalhe do item aberto DA BAG volta pra Bag (não
// fecha tudo); aberto FORA da bag, fecha normal; e a Bag fecha de vez no Close.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));

const url = `${acct.site.replace(/\/$/, '')}/src/ui/shared.js?v=327`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('dismissModal')) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  if (!deployed) problems.push('deploy não publicou shared.js com dismissModal a tempo');
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);

  const out = await page.evaluate(() => {
    const overlayOpen = () => { const o = document.getElementById('modal-overlay'); return !!o && getComputedStyle(o).display !== 'none'; };
    const hasBag = () => !!document.getElementById('inventory-grid');
    if (window.closeModal) window.closeModal();
    // 1) abre a Bag, pega o 1º item
    window.toggleBackpack();
    const first = document.querySelector('.inv-item');
    if (!first) return { err: 'sem inv-item' };
    const itemId = first.dataset.itemId;
    // abre o detalhe DA BAG
    first.click();
    const afterOpenFromBag = { overlay: overlayOpen(), bag: hasBag() }; // detalhe: overlay on, bag NÃO (foi substituída)
    // Close (dismiss) → deve VOLTAR pra Bag
    window.dismissModal();
    const afterCloseFromBag = { overlay: overlayOpen(), bag: hasBag() }; // esperado: overlay on + bag on
    // fecha a Bag (dismiss) → deve fechar de vez
    window.dismissModal();
    const afterCloseBag = { overlay: overlayOpen() }; // esperado: overlay off
    // 2) regressão: detalhe FORA da bag (fromBag=false) → Close fecha de vez
    window.openItemModal(itemId, false);
    const afterOpenNoBag = { overlay: overlayOpen() };
    window.dismissModal();
    const afterCloseNoBag = { overlay: overlayOpen(), bag: hasBag() }; // esperado: overlay off
    return { itemId, afterOpenFromBag, afterCloseFromBag, afterCloseBag, afterOpenNoBag, afterCloseNoBag };
  });

  console.log('[probe]', JSON.stringify(out, null, 0));
  if (out.err) problems.push(out.err);
  else {
    if (!out.afterCloseFromBag.overlay || !out.afterCloseFromBag.bag) problems.push('Close do detalhe (da Bag) NÃO voltou pra Bag: ' + JSON.stringify(out.afterCloseFromBag));
    if (out.afterCloseBag.overlay) problems.push('Close da Bag não fechou o modal');
    if (out.afterCloseNoBag.overlay) problems.push('Close do detalhe FORA da bag não fechou (regressão)');
  }
  if (problems.length === 0 && page.__ok) {}
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Close do item OK: da Bag→volta pra Bag; Bag→fecha; fora da bag→fecha; 0 erros');
process.exitCode = problems.length ? 1 : 0;
