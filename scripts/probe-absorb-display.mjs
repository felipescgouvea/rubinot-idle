// Probe: o detalhe do item mostra a resistência elemental (chip 🛡️ 🔥 +8%)?
// Abre o modal de um item com absorb (dragon_scale_mail) direto e confere o DOM.
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
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForFunction(() => { const g = document.getElementById('auth-gate'); return !g || g.style.display === 'none' || g.offsetParent === null; }, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);

  // abre o detalhe de um item com resistência (fogo) e um sem — compara
  const res = await page.evaluate(() => {
    const out = {};
    if (!window.openItemModal) return { err: 'openItemModal ausente' };
    window.openItemModal('dragon_scale_mail'); // fire +8
    out.withAbsorb = document.querySelector('.item-absorb')?.innerText || null;
    out.chip = document.querySelector('.absorb-chip')?.innerText || null;
    // fecha e abre um sem resistência
    (window.closeModal || (()=>{}))();
    window.openItemModal('leather_armor'); // sem absorb
    out.withoutAbsorb = document.querySelector('.item-absorb')?.innerText || null;
    return out;
  });
  console.log('[probe] dragon_scale_mail .item-absorb =', JSON.stringify(res.withAbsorb));
  console.log('[probe] chip =', JSON.stringify(res.chip));
  console.log('[probe] leather_armor .item-absorb =', JSON.stringify(res.withoutAbsorb));
  if (res.err) problems.push(res.err);
  if (!res.withAbsorb || !/🔥/.test(res.withAbsorb) || !/8%/.test(res.withAbsorb)) problems.push('resistência de fogo NÃO apareceu no detalhe do dragon_scale_mail');
  if (res.withoutAbsorb) problems.push('item SEM resistência (leather_armor) mostrou linha de resistência (não deveria)');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ display de resistência OK');
process.exitCode = problems.length ? 1 : 0;
