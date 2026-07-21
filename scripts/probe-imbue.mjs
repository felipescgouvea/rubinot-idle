// E2e do Imbuement: com materiais + gold, abre o modal 🔮, aplica Scorch e
// confere que fica ativo na arma. A verificação no banco é feita por fora.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(9000); // login + reconcile (traz gold + materiais)
  const before = await page.evaluate(() => {
    window.openImbueModal();
    const rows = document.querySelectorAll('.imbue-row').length;
    const btns = Array.from(document.querySelectorAll('.imbue-btn'));
    const scorchRow = Array.from(document.querySelectorAll('.imbue-row')).find(r => r.textContent.includes('Scorch'));
    const scorchBtn = btns.find(b => b.closest('.imbue-row')?.textContent.includes('Scorch'));
    return { rows, scorchEnabled: scorchBtn ? !scorchBtn.disabled : null, scorchText: scorchRow?.textContent.replace(/\s+/g, ' ').trim() };
  });
  console.log('[probe] modal:', JSON.stringify(before));
  if (before.rows !== 3) problems.push(`esperava 3 imbuements, achei ${before.rows}`);
  if (!before.scorchEnabled) problems.push('botão Scorch desabilitado mesmo com gold+materiais');
  // aplica
  await page.evaluate(() => window.applyImbuementClick('scorch'));
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => document.querySelector('.imbue-active')?.textContent || '');
  console.log('[probe] ativo após aplicar:', JSON.stringify(after));
  if (!/Scorch/.test(after)) problems.push('Scorch não ficou ativo na arma após aplicar');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Imbuement aplicado no browser (Scorch ativo na arma)');
process.exitCode = problems.length ? 1 : 0;
