// Prova a11y do tablist: #tabs role=tablist; abas role=tab + aria-selected; a
// ativa é aria-selected=true; clicar troca o aria-selected; 0 erros.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const url = `${acct.site.replace(/\/$/, '')}/src/ui/tabs.js?v=341`;
let deployed = false;
for (let i = 0; i < 30; i++) {
  try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok && (await r.text()).includes("'tablist'")) { deployed = true; break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  if (!deployed) problems.push('deploy não publicou tabs.js a11y a tempo');
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(7000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });

  const out = await page.evaluate(() => {
    const tablistRole = document.getElementById('tabs')?.getAttribute('role');
    const someTab = document.querySelector('.tab');
    const tabRole = someTab?.getAttribute('role');
    const activeSel = document.querySelector('.tab.active')?.getAttribute('aria-selected');
    const activeName = document.querySelector('.tab.active')?.dataset.tab;
    const panelRole = document.getElementById('tab-hunt')?.getAttribute('role');
    // clica numa aba diferente (skills) e checa a troca de aria-selected
    const skills = document.querySelector('.tab[data-tab="skills"]');
    skills?.click();
    const skillsSel = skills?.getAttribute('aria-selected');
    const oldActiveSel = document.querySelector(`.tab[data-tab="${activeName}"]`)?.getAttribute('aria-selected');
    return { tablistRole, tabRole, activeSel, panelRole, skillsSel, oldActiveSel };
  });
  console.log('[probe]', JSON.stringify(out));
  if (out.tablistRole !== 'tablist') problems.push(`#tabs role != tablist (${out.tablistRole})`);
  if (out.tabRole !== 'tab') problems.push(`aba role != tab (${out.tabRole})`);
  if (out.activeSel !== 'true') problems.push(`aba ativa aria-selected != true (${out.activeSel})`);
  if (out.panelRole !== 'tabpanel') problems.push(`painel role != tabpanel (${out.panelRole})`);
  if (out.skillsSel !== 'true') problems.push(`ao clicar Skills, aria-selected != true (${out.skillsSel})`);
  if (out.oldActiveSel !== 'false') problems.push(`aba antiga não voltou a aria-selected=false (${out.oldActiveSel})`);
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Tablist a11y OK: role tablist/tab/tabpanel, aria-selected reflete e troca no clique, 0 erros');
process.exitCode = problems.length ? 1 : 0;
