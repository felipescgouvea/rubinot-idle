// Prova: no ranking, jogadores presentes em onlineNames ganham o ponto verde
// (.hs-online-dot); os demais não. Contra produção.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o highscoresPanel novo (com nameCell/hs-online-dot)
for (let i = 0; i < 30; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/highscoresPanel\.js\?v=(\d+)/); if (m) { const js = await (await fetch(site + '/src/ui/highscoresPanel.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('hs-online-dot')) break; } } catch {}
  await new Promise(r => setTimeout(r, 4000));
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
try {
  await page.goto(site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForSelector('#sidebar .tab[data-tab="highscores"]', { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  // dá tempo do polling do /online ticar e da presença desta sessão registrar
  await page.waitForTimeout(6000);
  // abre highscores (categoria level) e re-renderiza pra pegar o snapshot atual
  await page.evaluate(() => document.querySelector('.tab[data-tab="highscores"]')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.setHighscoresCategory && window.setHighscoresCategory('level'));
  await page.waitForSelector('.hs-table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.hs-table tbody tr')].map(tr => {
      const nameTd = tr.children[1];
      return { name: nameTd?.querySelector('strong')?.textContent, hasDot: !!nameTd?.querySelector('.hs-online-dot'), me: tr.classList.contains('hs-me') };
    });
    return rows;
  });
  // fonte da verdade: onlineNames do servidor (node fetch) ∪ o próprio jogador
  // (linha hs-me — logado = online). Tolera lag do cache de 8s do /online.
  const api = 'https://rubinot-idle-hunt-server-production.up.railway.app';
  const onl = await (await fetch(api + '/online', { cache: 'no-store' })).json().catch(() => ({}));
  const truth = new Set(Array.isArray(onl.onlineNames) ? onl.onlineNames : []);
  const meRow = out.find(r => r.me); if (meRow) truth.add(meRow.name);
  console.log('[probe] onlineNames(server) =', JSON.stringify([...truth]));
  console.log('[probe] rows =', JSON.stringify(out));
  const dotted = out.filter(r => r.hasDot).map(r => r.name);
  for (const r of out) {
    if (r.hasDot && !truth.has(r.name)) problems.push(`ponto em quem não está online: ${r.name}`);
    if (!r.hasDot && truth.has(r.name)) problems.push(`sem ponto em quem está online: ${r.name}`);
  }
  if (meRow && !meRow.hasDot) problems.push('o próprio jogador (online) não recebeu ponto');
  if (!dotted.length) problems.push('nenhum ponto na tabela apesar de haver online');
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-highscores-online.png') });
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ ranking marca online corretamente (ponto ⟷ onlineNames), 0 erros');
process.exitCode = problems.length ? 1 : 0;
