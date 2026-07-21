// Teste end-to-end da promoção: com a conta em nível 20 + gold, chama
// promoteVocation() e confere que o nome vira "Elder Druid" e o botão some.
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
  await page.waitForTimeout(8000); // login + reconcile (nível/gold do servidor)

  const before = await page.evaluate(() => ({
    voc: document.getElementById('char-voc-name')?.textContent,
    btn: document.getElementById('promote-btn')?.textContent,
    btnShown: document.getElementById('promote-btn')?.style.display !== 'none',
    btnDisabled: document.getElementById('promote-btn')?.disabled,
  }));
  console.log('[probe] ANTES:', JSON.stringify(before));
  if (before.voc !== 'Druid') problems.push(`nome antes = ${before.voc} (esperado Druid)`);
  if (!before.btnShown) problems.push('botão Promover não apareceu no nível 20');
  if (before.btnDisabled) problems.push('botão Promover desabilitado mesmo com nível 20 + 25k gold');

  // promove
  await page.evaluate(() => window.promoteVocation && window.promoteVocation());
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => ({
    voc: document.getElementById('char-voc-name')?.textContent,
    btnShown: document.getElementById('promote-btn')?.style.display !== 'none',
  }));
  console.log('[probe] DEPOIS:', JSON.stringify(after));
  if (after.voc !== 'Elder Druid') problems.push(`nome depois = ${after.voc} (esperado Elder Druid)`);
  if (after.btnShown) problems.push('botão Promover ainda visível após promover');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ promoção funcionou no browser (Druid → Elder Druid, botão sumiu)');
process.exitCode = problems.length ? 1 : 0;
