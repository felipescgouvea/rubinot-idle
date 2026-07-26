// Prova: o onboarding (coach-mark) aparece pro jogador "novo" (flag limpa),
// destaca o alvo, avança pelos 3 passos, e NÃO reaparece depois (persistência).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
for (let i = 0; i < 45; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/ui\/onboarding\.js\?v=(\d+)/);
    if (m) break; } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
// browser novo já tem localStorage vazio → onboarding aparece na 1ª sem precisar limpar
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  // o coach-mark aparece ~900ms após o boot
  await page.waitForSelector('.onboard-overlay .onboard-card', { timeout: 15000 });
  await page.waitForTimeout(400);
  const step1 = await page.evaluate(() => {
    const card = document.querySelector('.onboard-card');
    const spot = document.querySelector('.onboard-spot');
    const target = document.querySelector('#hunt-toggle')?.getBoundingClientRect();
    const sr = spot?.getBoundingClientRect();
    // spot cobre o hunt-toggle?
    const covers = target && sr && sr.left <= target.left + 4 && sr.right >= target.right - 4 && sr.top <= target.top + 4;
    return { text: card?.querySelector('.onboard-text')?.textContent?.trim().slice(0, 40), covers, dots: card?.querySelector('.onboard-dots')?.textContent };
  });
  console.log('[passo 1]', JSON.stringify(step1));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-onboarding.png') });
  // avança pelos passos
  let clicks = 0;
  while (await page.$('.onboard-next') && clicks < 5) {
    await page.click('.onboard-next'); await page.waitForTimeout(350); clicks++;
    if (!(await page.$('.onboard-overlay'))) break;
  }
  const goneAfter = !(await page.$('.onboard-overlay'));
  // recarrega: NÃO deve reaparecer (persistência)
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#hunt-toggle', { timeout: 45000 });
  await page.waitForTimeout(2500);
  const reappeared = !!(await page.$('.onboard-overlay'));

  if (!step1.covers) problems.push('spotlight não cobre o #hunt-toggle no passo 1');
  if (!step1.text) problems.push('card do passo 1 sem texto');
  if (!goneAfter) problems.push('coach-mark não fechou após avançar os passos');
  if (reappeared) problems.push('coach-mark REAPARECEU após reload (persistência falhou)');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ onboarding: aparece, destaca o alvo, avança 3 passos, não reaparece; 0 erros');
process.exitCode = problems.length ? 1 : 0;
