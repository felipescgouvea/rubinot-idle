// Prova os selos de "resgatável" nas abas Tasks/Battle Pass: setTabBadge cria/
// mostra/esconde o ponto no botão da aba certa, e os emits de boot (ACTIVE_TASK/
// BATTLE_PASS_PANEL, que agora chamam setTabBadge) não estouram.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const VER = 314;

const url = `${acct.site.replace(/\/$/, '')}/src/ui/notifyTitle.js?v=${VER}`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes('setTabBadge')) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  if (!deployed) problems.push(`deploy não publicou notifyTitle.js?v=${VER} com setTabBadge a tempo`);
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000); // boot completo (com os emits que chamam setTabBadge)

  const out = await page.evaluate(async (ver) => {
    const m = await import(new URL(`src/ui/notifyTitle.js?v=${ver}`, location.href).href);
    function state(tab) {
      const b = document.querySelector(`.tab[data-tab="${tab}"] .tab-badge`);
      return b ? (b.style.display === 'none' ? 'hidden' : 'visible') : 'ausente';
    }
    const r = {};
    for (const tab of ['tasks', 'battlepass']) {
      m.setTabBadge(tab, true);  const on = state(tab);
      m.setTabBadge(tab, false); const off = state(tab);
      r[tab] = { on, off };
    }
    // aba inexistente não pode quebrar
    let safe = true; try { m.setTabBadge('naoexiste', true); } catch { safe = false; }
    return { r, safe };
  }, VER);

  console.log('[probe] tasks:', JSON.stringify(out.r.tasks), '| battlepass:', JSON.stringify(out.r.battlepass), '| aba inexistente segura:', out.safe);

  for (const tab of ['tasks', 'battlepass']) {
    if (out.r[tab].on !== 'visible') problems.push(`${tab}: selo não apareceu com on=true (veio ${out.r[tab].on})`);
    if (out.r[tab].off !== 'hidden') problems.push(`${tab}: selo não sumiu com on=false (veio ${out.r[tab].off})`);
  }
  if (!out.safe) problems.push('setTabBadge estourou numa aba inexistente');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Selos de aba OK: aparece/some em Tasks e Battle Pass, aba inexistente é segura, 0 erros de boot');
process.exitCode = problems.length ? 1 : 0;
