// Probe: o modal 🏆 Achievements abre, lista as conquistas e o seletor de título
// funciona (sem erros de console).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
const errs = [];
page.on('pageerror', e => errs.push((e.message || String(e)).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => {
    window.openAchievements();
    const rows = document.querySelectorAll('.ach-row').length;
    const on = document.querySelectorAll('.ach-row.on').length;
    const titleBtns = document.querySelectorAll('.ach-title-btn').length;
    return { rows, on, titleBtns };
  });
  console.log('[probe] achievements:', JSON.stringify(r));
  if (r.rows !== 17) problems.push(`esperava 17 conquistas, achei ${r.rows}`);
  if (r.titleBtns < 1) problems.push('nenhum botão de título (nem "Sem título")');
  // seletor de título: "Sem título" deve funcionar sem erro
  await page.evaluate(() => window.setPlayerTitle(''));
  await page.waitForTimeout(500);
  const voc = await page.evaluate(() => document.getElementById('char-voc-name')?.textContent);
  console.log('[probe] char-voc-name após setPlayerTitle(""):', JSON.stringify(voc));
  if (!voc || /,/.test(voc)) problems.push(`nome da vocação com título indevido: ${voc}`);
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
if (errs.length) problems.push('erros de console/página: ' + errs.slice(0, 3).join(' | '));
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Achievements OK (modal, lista, seletor de título)');
process.exitCode = problems.length ? 1 : 0;
