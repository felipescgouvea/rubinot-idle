// Screenshots de diagnóstico: aba Tasks (cards de task) e aba Shop (botões de
// navegação da loja) — pra ver o "fundo horrível" reportado. Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="tasks"]', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  for (const [tab, file] of [['tasks', 'shot-tab-tasks.png'], ['shop', 'shot-tab-shop.png']]) {
    await page.evaluate(t => document.querySelector(`.tab[data-tab="${t}"]`)?.click(), tab);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(ROOT, 'scripts', file) });
    console.log('salvo', file);
  }
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
