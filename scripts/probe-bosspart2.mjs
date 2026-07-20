import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(6000);
  // Banner de prestígio na aba Boss Zone
  await page.click('button.tab[data-tab="bossrush"]');
  await page.waitForTimeout(1500);
  const bannerTxt = await page.evaluate(() => {
    const g = document.getElementById('bossrush-grid');
    const first = g?.querySelector('div'); return first ? first.innerText.replace(/\n/g,' ') : '(vazio)';
  });
  console.log('[probe] banner boss zone:', JSON.stringify(bannerTxt.slice(0,120)));
  const bossTiers = await page.evaluate(() => (window.G && window.G.bossTiers) || (window.__store && window.__store.G && window.__store.G.bossTiers) || 'n/a');
  console.log('[probe] G.bossTiers:', JSON.stringify(bossTiers));
  // Highscores: submeter e abrir categoria Boss
  await page.click('button.tab[data-tab="highscores"]');
  await page.waitForTimeout(1500);
  const hasRefresh = await page.evaluate(() => !!window.refreshHighscoresClick && !!document.querySelector('.btn-blue'));
  console.log('[probe] tem botão de submit:', hasRefresh);
  await page.evaluate(() => window.refreshHighscoresClick && window.refreshHighscoresClick());
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.setHighscoresCategory && window.setHighscoresCategory('boss'));
  await page.waitForTimeout(3000);
  const hs = await page.evaluate(() => document.getElementById('hs-table-area')?.innerText.split('\n').filter(Boolean).slice(0,8));
  console.log('[probe] ranking Boss:', JSON.stringify(hs));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
