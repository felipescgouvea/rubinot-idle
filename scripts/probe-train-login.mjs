// Só loga no jogo e espera ~18s pra o resumeTrainingOnLoad creditar o treino
// offline pendente (+ alguns ticks). A verificação real é via SQL depois.
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
  await page.waitForTimeout(18000); // login + resumeTrainingOnLoad (credita offline) + ticks
  // tenta ler o nível de Magic exibido (corrobora; a prova real é o SQL)
  const magic = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(e => /magic/i.test(e.textContent || '') && e.children.length === 0);
    return els.slice(0, 3).map(e => e.textContent.trim());
  }).catch(() => null);
  console.log('[login] ok; magic (DOM, aprox):', JSON.stringify(magic));
} catch (e) { console.log('EXCEÇÃO', e.message); }
finally { await browser.close(); }
