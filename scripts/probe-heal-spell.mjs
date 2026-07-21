// Probe: o cliente (após o bump) conhece as curas de Dawnport e resolve a cura
// certa no nível 1? Importa o spells.js servido em produção e confere.
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
  await page.waitForTimeout(5000);
  const res = await page.evaluate(async () => {
    const base = new URL('src/domain/spells.js?v=127', location.href).href;
    const m = await import(base);
    const out = { hasMagicPatch: !!m.SPELLS.magic_patch, hasBruiseBane: !!m.SPELLS.bruise_bane };
    out.lvl1druid = m.defaultHealSpellId('druid', 1);
    out.lvl1knight = m.defaultHealSpellId('knight', 1);
    out.lvl20druid = m.defaultHealSpellId('druid', 20);
    out.magicPatchAvailLvl1 = m.isSpellAvailable('magic_patch', 'druid', 1);
    return out;
  });
  console.log('[probe]', JSON.stringify(res, null, 0));
  if (!res.hasMagicPatch) problems.push('cliente NÃO conhece magic_patch (spells.js ainda stale)');
  if (res.lvl1druid !== 'magic_patch') problems.push(`defaultHealSpellId(druid,1) = ${res.lvl1druid} (esperado magic_patch)`);
  if (res.lvl1knight !== 'bruise_bane') problems.push(`defaultHealSpellId(knight,1) = ${res.lvl1knight} (esperado bruise_bane)`);
  if (!res.magicPatchAvailLvl1) problems.push('magic_patch marcado indisponível no nível 1');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ cliente conhece as curas de Dawnport e resolve certo no nível 1');
process.exitCode = problems.length ? 1 : 0;
