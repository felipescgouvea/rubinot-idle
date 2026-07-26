// Prova o fix "munição em lote compra só 1": confirmBuyShopItem deve embutir a
// QUANTIDADE selecionada pra ammo (antes caía em count=1). Lê o onclick do botão
// de confirmar (não clica → não gasta gold do test-account). Controle: um item
// de equipamento não-empilhável (bow) tem que continuar em 1.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const VER = 320;

// espera o Pages publicar o shopPanel novo (com o fix 'ammo')
const url = `${acct.site.replace(/\/$/, '')}/src/ui/shopPanel.js?v=${VER}`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes("item.type === 'ammo'")) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  if (!deployed) problems.push(`deploy não publicou shopPanel.js?v=${VER} com o fix a tempo`);
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);

  const out = await page.evaluate(() => {
    function onclickFor(id, qty) {
      window.confirmBuyShopItem(id, qty);
      const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('onclick') || '').includes(`buyShopItem('${id}'`));
      const oc = b ? b.getAttribute('onclick') : null;
      if (window.closeModal) window.closeModal();
      return oc;
    }
    return {
      ammo: onclickFor('buy_arrow', 7),   // ammo → deve embutir 7
      bow:  onclickFor('buy_bow', 5),      // equipamento não-empilhável → deve ficar 1
    };
  });

  console.log('[probe] ammo (buy_arrow, qty 7):', out.ammo);
  console.log('[probe] control (buy_bow, qty 5):', out.bow);

  if (!out.ammo || !/buyShopItem\('buy_arrow',\s*7\)/.test(out.ammo)) problems.push(`ammo NÃO respeitou a qty (esperava buyShopItem('buy_arrow', 7), veio: ${out.ammo})`);
  if (!out.bow || !/buyShopItem\('buy_bow',\s*1\)/.test(out.bow)) problems.push(`controle quebrou: bow deveria ser 1 (veio: ${out.bow})`);
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Loja/munição OK: ammo compra a quantidade selecionada (7); equipamento continua 1; 0 erros');
process.exitCode = problems.length ? 1 : 0;
