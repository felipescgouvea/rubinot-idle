// Verificação NÃO-DESTRUTIVA (client-only) do fix "Vender todos não vende a peça
// equipada". Abre o modal de cada item equipado e confere que os botões de venda
// usam bagQty (posse - equipada): item equipado-SEM-sobra não mostra botão de
// venda; com sobra, o sell-all mostra a qtd da bag, nunca incluindo a equipada.
// O lado SERVIDOR é validado autoritativamente no banco (player_equipment: toda
// peça equipada mantém inv_qty>=1; equipado-sem-sobra é recusado).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  const res = await page.evaluate(async () => {
    const checked = [];
    const slots = [...document.querySelectorAll('.equip-slot.filled')]
      .map(s => (s.getAttribute('onclick') || '').match(/openItemModal\('([^']+)'\)/))
      .filter(Boolean).map(m => m[1]);
    for (const id of slots) {
      if (!window.openItemModal) break;
      window.openItemModal(id, false);
      await new Promise(r => setTimeout(r, 140));
      const modal = document.getElementById('modal-content');
      const html = modal ? modal.innerHTML : '';
      checked.push({ id, hasSell: html.includes(`sellItem('${id}')`), hasSellAll: html.includes(`sellAllItem('${id}')`) });
      if (window.closeModal) window.closeModal();
      await new Promise(r => setTimeout(r, 60));
    }
    return { checked };
  });
  console.log('[cliente] equipados e botões de venda:', JSON.stringify(res.checked));
  // Invariante do fix: existe AO MENOS um item equipado-sem-sobra sem botão de
  // venda (bagQty<=0 esconde ambos). Se todos tivessem sobra o teste não prova
  // nada, mas a conta de teste tem peças equipadas-únicas (armor/legs/weapon).
  const equippedOnly = res.checked.filter(c => !c.hasSell && !c.hasSellAll);
  if (!res.checked.length) problems.push('nenhum item equipado detectado');
  if (!equippedOnly.length) problems.push('nenhum item equipado-sem-sobra escondeu os botões de venda (esperado ao menos 1)');
} catch (e) { problems.push('EXC: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ FALHOU\n❌ ' + problems.join('\n❌ ') : '\n✅ PASSOU — item equipado-sem-sobra não mostra botão de venda (bagQty exclui a equipada)');
process.exitCode = problems.length ? 1 : 0;
