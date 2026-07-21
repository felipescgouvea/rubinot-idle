import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
try {
  await page.goto(acct.site, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({
    hasAuth: !!document.getElementById('auth-email'),
    hasCharInput: !!document.getElementById('char-name-input'),
    bodyStart: document.body.innerText.slice(0, 150).replace(/\n+/g,' '),
  }));
  console.log('[probe] estado:', JSON.stringify(state));
  console.log('[probe] erros:', errs.length ? JSON.stringify(errs.slice(0,5)) : 'nenhum');
} catch (e) { console.log('ERRO', e.message); console.log('erros console:', JSON.stringify(errs.slice(0,5))); }
finally { await browser.close(); }
