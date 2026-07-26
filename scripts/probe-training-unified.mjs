// Prova do treino unificado: aba Training tem UM só card (sem "Online Training"
// separado); iniciar um treino mostra o card ativo com o PALCO (boneco/outfit);
// 0 erros. Contra produção. (Servidor: rate por contexto — verificado à parte.)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const site = acct.site.replace(/\/$/, '');
// espera o trainingPanel novo (com a chave startTrainingBtn no pt.js)
for (let i = 0; i < 40; i++) {
  try { const idx = await (await fetch(site + '/index.html', { cache: 'no-store' })).text();
    const m = idx.match(/locales\/pt\.js\?v=(\d+)/); if (m) { const js = await (await fetch(site + '/src/i18n/locales/pt.js?v=' + m[1], { cache: 'no-store' })).text();
      if (js.includes('startTrainingBtn')) break; } } catch {}
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
  await page.waitForSelector('#sidebar .tab[data-tab="training"]', { timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.closeModal) window.closeModal(); });
  await page.evaluate(() => document.querySelector('.tab[data-tab="training"]')?.click());
  await page.waitForSelector('#tab-training .training-skill-grid, #tab-training .training-active', { timeout: 20000 });
  // estado da aba: quantos cards, se há o header "Online Training" legado
  const layout = await page.evaluate(() => ({
    cards: document.querySelectorAll('#tab-training .card').length,
    hasOnlineHeader: !!document.querySelector('#tab-training [data-i18n="training.onlineTraining"]'),
    hasLegacyBody: !!document.getElementById('online-training-body'),
    alreadyTraining: !!document.querySelector('#tab-training .training-active'),
  }));
  console.log('[layout]', JSON.stringify(layout));
  // se já estava treinando (de outra sessão), para pra testar o start limpo
  if (layout.alreadyTraining) { await page.evaluate(() => window.stopTraining && window.stopTraining()); await page.waitForTimeout(1500); }
  // inicia um treino de skill de arma (pega o 1º botão da grade)
  await page.waitForSelector('#tab-training .training-skill-btn', { timeout: 10000 });
  const skillStarted = await page.evaluate(() => {
    const btn = document.querySelector('#tab-training .training-skill-btn');
    const name = btn?.querySelector('span')?.textContent;
    btn?.click();
    return name;
  });
  await page.waitForTimeout(3500);
  const active = await page.evaluate(() => {
    const card = document.querySelector('#tab-training .training-active');
    const stage = card?.querySelector('.training-stage, canvas, .training-stage-player, img');
    const stopBtn = !!card?.querySelector('button.danger');
    return { hasActive: !!card, hasStage: !!stage, hasStop: stopBtn, title: card?.querySelector('.training-active-title')?.textContent?.trim() };
  });
  console.log('[active]', JSON.stringify({ skillStarted, ...active }));
  await page.screenshot({ path: join(ROOT, 'scripts', 'shot-training-unified.png') });
  // limpa: para o treino (deixa a conta sem treino ativo)
  await page.evaluate(() => window.stopTraining && window.stopTraining());
  await page.waitForTimeout(1200);

  if (layout.cards !== 1) problems.push(`aba Training tem ${layout.cards} cards, esperava 1 (painel único)`);
  if (layout.hasOnlineHeader) problems.push('ainda existe o header "Online Training" legado');
  if (!active.hasActive) problems.push('iniciar treino não mostrou o card ativo');
  if (!active.hasStage) problems.push('card ativo sem o palco (boneco/outfit)');
  if (!active.hasStop) problems.push('card ativo sem botão de parar');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); }
finally { await browser.close(); }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ treino unificado: 1 painel, inicia com palco/outfit, para; 0 erros');
process.exitCode = problems.length ? 1 : 0;
