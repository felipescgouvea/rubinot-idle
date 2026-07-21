import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const ZONE = process.argv[2] || 'wolf_den';
const SECS = +(process.argv[3] || 120);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errs = new Set();
page.on('console', m => { if (m.type() === 'error') errs.add(m.text().slice(0, 160)); });
page.on('requestfailed', r => errs.add('REQFAIL ' + r.url().split('/').pop()));
page.on('response', r => { if (r.status() === 404) errs.add('404 ' + r.url().split('/').pop()); });
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit'); await page.waitForTimeout(7000);

  // cria personagem se a conta estiver zerada
  await page.evaluate(async () => {
    const btn = document.querySelector('.voc-btn[data-voc="knight"]');
    if (btn && btn.offsetParent !== null && window.createCharacter) window.createCharacter('knight');
  });
  await page.waitForTimeout(5000);

  const started = await page.evaluate(async (z) => {
    const m = await import('./src/application/huntUseCases.js?v=227');
    m.selectZone(z);
    await new Promise(r => setTimeout(r, 800));
    if (m.startHunt) m.startHunt(); else window.toggleHunt();
    return true;
  }, ZONE).catch(e => 'ERR ' + e.message);
  console.log('start:', started);

  await page.waitForTimeout(SECS * 1000);
  const out = await page.evaluate(() => {
    const el = document.getElementById('combat-log');
    const rows = [...el.querySelectorAll('*')].filter(n => n.children.length === 0 || n.classList.contains('log-line'));
    return [...el.children].map(n => ({
      cat: n.dataset.cat || n.className,
      text: n.innerText.trim(),
      imgs: [...n.querySelectorAll('img')].map(i => i.getAttribute('src').split('/').pop()),
      emoji: [...n.querySelectorAll('span')].map(s => s.textContent).filter(t => t && t.length <= 3),
    }));
  });
  console.log('--- TODAS as linhas (' + out.length + ') ---');
  out.slice(-45).forEach(r => console.log(' [' + r.cat + '] ' + r.text.split(String.fromCharCode(10)).join(' / ') + ' | imgs: ' + r.imgs.join(',') + ' | emoji: ' + r.emoji.join('')));
  await page.evaluate(() => window.toggleHunt && window.toggleHunt());
  await page.waitForTimeout(1500);
} catch (e) { console.log('EX', e.message); }
finally {
  console.log('--- erros/404 ---'); [...errs].slice(0, 25).forEach(e => console.log(' ', e));
  await browser.close();
}
