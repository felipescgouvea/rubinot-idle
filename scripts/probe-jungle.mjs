import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 560, height: 400 } });
const fails=[];
page.on('response', r => { if (r.url().includes('scene-') && r.status()!==200) fails.push(r.url()+' '+r.status()); });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(6500);
  await page.evaluate(() => { document.getElementById('battle-modal-overlay').style.display='flex';
                              document.getElementById('dungeon-stage').dataset.biome='jungle'; });
  await page.waitForTimeout(5000);   // espera a imagem carregar de verdade
  const st = await page.$('#dungeon-stage');
  await st.screenshot({ path: join(ROOT,'scripts','bio-jungle.png') });
  console.log('falhas de scene:', fails.length ? fails : 'nenhuma');
} catch(e){ console.log('EX', e.message); } finally { await b.close(); }
