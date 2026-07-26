// Prova o CTA da Boosted Creature: o card vira clicável e abre o zone picker na
// cidade certa (não auto-inicia a caça). Verifica o onclick + o clique abrindo o
// modal com a grade de cidades.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
// Espera o deploy do bestiary.js novo (pool restrito a criaturas huntáveis) —
// é a peça que faz a Boosted Creature de hoje ter zona e o card ficar clicável.
const url = `${acct.site.replace(/\/$/, '')}/src/domain/bestiary.js?v=337`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('HUNTABLE_CREATURE_IDS')) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  if (!deployed) problems.push(`deploy não publicou boostedPanel.js?v=${VER} com o CTA a tempo`);
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000); // boot; aba Caçada é a default → boosted renderizado

  const out = await page.evaluate(() => {
    const card = document.querySelector('#boosted-body .boosted-item.boosted-clickable');
    if (!card) return { clickable: false };
    const onclick = card.getAttribute('onclick') || '';
    card.click();
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    const open = overlay && getComputedStyle(overlay).display !== 'none';
    const hasContent = !!(content && content.textContent.trim().length > 20);
    if (window.closeModal) window.closeModal();
    return { clickable: true, onclick, open, hasContent };
  });

  console.log('[probe]', JSON.stringify(out));

  if (!out.clickable) {
    problems.push('a Boosted Creature de hoje não ficou clicável (sem zona mapeada?) — CTA não pôde ser exercitado');
  } else {
    if (!/openZonePicker\(\)\s*;\s*openCity\('[a-z_]+'\)/.test(out.onclick)) problems.push(`onclick inesperado: ${out.onclick}`);
    if (!out.open) problems.push('clicar no card NÃO abriu o modal do zone picker');
    if (!out.hasContent) problems.push('modal abriu mas sem conteúdo (grade de cidades vazia)');
  }
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Boosted CTA OK: card clicável abre o zone picker na cidade da criatura, 0 erros');
process.exitCode = problems.length ? 1 : 0;
