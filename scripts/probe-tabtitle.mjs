// Verifica o gancho de re-engajamento: título da aba "(N) Rubinot Idle".
// (1) nenhum erro de boot (os novos emits ACTIVE_TASK/BATTLE_PASS_PANEL no boot
//     não podem estourar em getElementById().innerHTML sem guard);
// (2) o mecanismo funciona ao vivo: setTitleFlag conta categorias e escreve o título.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));

// espera o deploy do Pages publicar a versão nova do módulo
const VER = 312;
async function waitDeploy() {
  const url = `${acct.site.replace(/\/$/, '')}/src/ui/notifyTitle.js?v=${VER}`;
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('setTitleFlag')) return true; } catch {}
    await new Promise(r => setTimeout(r, 4000));
  }
  return false;
}

const deployed = await waitDeploy();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
try {
  if (!deployed) problems.push('deploy do Pages não publicou notifyTitle.js?v=' + VER + ' a tempo');
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000); // boot completo (incl. os emits de boot)

  const out = await page.evaluate(async (ver) => {
    const initial = document.title;
    const m = await import(new URL(`src/ui/notifyTitle.js?v=${ver}`, location.href).href);
    const count = t => { const mm = t.match(/^\((\d+)\) /); return mm ? +mm[1] : 0; };
    const base = t => t.replace(/^\(\d+\) /, '');
    const c0 = count(initial);
    m.setTitleFlag('__probeA__', true); const t1 = document.title;
    m.setTitleFlag('__probeB__', true); const t2 = document.title;
    m.setTitleFlag('__probeA__', false); m.setTitleFlag('__probeB__', false);
    const t3 = document.title;
    return { initial, base: base(initial), c0, t1, c1: count(t1), t2, c2: count(t2), t3 };
  }, VER);

  console.log('[probe] título inicial (estado real):', JSON.stringify(out.initial), '→ base:', JSON.stringify(out.base), '| flags reais:', out.c0);
  console.log('[probe] +1 flag:', JSON.stringify(out.t1), '(count', out.c1 + ')');
  console.log('[probe] +2 flags:', JSON.stringify(out.t2), '(count', out.c2 + ')');
  console.log('[probe] limpo de volta:', JSON.stringify(out.t3));

  if (out.base !== 'Rubinot Idle') problems.push(`título base errado: "${out.base}" (esperava "Rubinot Idle")`);
  if (out.c1 !== out.c0 + 1) problems.push(`+1 flag não incrementou (${out.c0}→${out.c1})`);
  if (out.c2 !== out.c0 + 2) problems.push(`+2 flags não incrementou (${out.c0}→${out.c2})`);
  if (out.t3 !== out.initial) problems.push(`limpar flags não voltou ao título inicial ("${out.t3}" vs "${out.initial}")`);
  if (pageErrors.length) problems.push('ERROS no boot/runtime: ' + pageErrors.slice(0, 5).join(' | '));
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Título da aba OK: base "Rubinot Idle", conta categorias resgatáveis, 0 erros de boot');
process.exitCode = problems.length ? 1 : 0;
