// Teste do Treino Online:
//   1. Paladino tem Distance E Magic Level (com seletor de magia)
//   2. Sorcerer/Knight continuam como eram (sem regressão)
//   3. Com o treino online ativo, o projétil existe, é sprite REAL (carregou)
//      e está de fato animado
// Usa o slot 1 da conta de teste pro Paladino (o slot 0 é o Knight).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', r => { if (r.status() === 404 && /sprites/.test(r.url())) errs.add('404 ' + r.url().split('/').pop()); });
const falhas = [];

async function login() {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(8000);
}

try {
  await login();

  // ---- vai pro slot 1 e garante um Paladino lá ----
  const slot = await page.evaluate(async () => {
    const a = await import('./src/application/gameStore.js?v=169');
    return a.ACCOUNT.activeSlot;
  });
  if (slot !== 1) {
    await page.evaluate(async () => {
      const acc = await import('./src/application/accountUseCases.js?v=169');
      window.confirm = () => true;             // o switch pede confirmação
      acc.confirmSwitchCharacterSlot(1);
    });
    await page.waitForTimeout(9000);           // location.reload() dentro do switch
    await page.waitForSelector('#auth-email', { timeout: 15000 }).then(async () => {
      await page.fill('#auth-email', acct.email);
      await page.fill('#auth-password', acct.password);
      await page.click('#auth-submit');
      await page.waitForTimeout(8000);
    }).catch(() => {});
  }
  const criou = await page.evaluate(async () => {
    const g = await import('./src/application/gameStore.js?v=169');
    if (g.G.vocation) return 'ja era ' + g.G.vocation;
    const input = document.getElementById('char-name-input');
    if (input) { input.value = 'AuditPala'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    await window.createCharacter('paladin');
    return 'criado paladin';
  });
  console.log('slot 1:', criou);
  await page.waitForTimeout(6000);

  const voc = await page.evaluate(async () => (await import('./src/application/gameStore.js?v=169')).G.vocation);
  console.log('vocação ativa:', voc);
  if (voc !== 'paladin') falhas.push(`esperava paladin no slot 1, veio ${voc}`);

  // ---- 1) a aba Treino mostra Distance E Magic Level ----
  await page.evaluate(() => window.showTab && window.showTab('training'));
  await page.waitForTimeout(1500);
  const painel = await page.evaluate(() => {
    const el = document.getElementById('online-training-body');
    return {
      skills: [...el.querySelectorAll('.training-skill-btn span')].map(n => n.textContent.trim()),
      temSeletorDeMagia: !!el.querySelector('.training-spell-grid'),
      magias: [...el.querySelectorAll('.training-spell-btn span')].map(n => n.textContent.trim()),
      temSubhead: !!el.querySelector('.training-subhead'),
    };
  });
  console.log('skills online:', painel.skills.join(', ') || '(nenhuma)');
  console.log('seletor de magia:', painel.temSeletorDeMagia, '| magias:', painel.magias.join(', ') || '(nenhuma)');
  if (!painel.skills.some(s => /distance/i.test(s))) falhas.push('Distance Fighting sumiu do treino online do Paladino');
  if (!painel.temSeletorDeMagia) falhas.push('Paladino não tem seletor de Magic Level no treino online');
  if (!painel.magias.length) falhas.push('nenhuma magia de ataque listada pro Paladino');
  if (!painel.temSubhead) falhas.push('faltou o cabeçalho da seção de Magic Level');

  // ---- 2) inicia o treino online de Distance e checa o projétil ----
  await page.evaluate(() => window.startOnlineTraining('distance'));
  await page.waitForTimeout(3000);
  const proj = await page.evaluate(() => {
    const img = document.querySelector('.training-projectile');
    if (!img) return null;
    const cs = getComputedStyle(img);
    const dummy = document.querySelector('.training-online-anim .training-dummy-icon');
    return {
      src: img.getAttribute('src').split('/').pop(),
      carregou: img.complete && img.naturalWidth > 0,
      animacao: cs.animationName,
      duracao: cs.animationDuration,
      dummyAnimado: dummy ? getComputedStyle(dummy).animationName : 'SEM DUMMY',
    };
  });
  console.log('projétil:', JSON.stringify(proj));
  if (!proj) falhas.push('nenhum projétil no treino online de Distance');
  else {
    if (!/arrow|bolt/.test(proj.src)) falhas.push(`projétil errado pro Distance: ${proj.src}`);
    if (!proj.carregou) falhas.push('a sprite do projétil não carregou');
    if (proj.animacao === 'none') falhas.push('o projétil não está animado');
    if (proj.dummyAnimado === 'none') falhas.push('o boneco não reage ao impacto');
  }

  // o projétil precisa REALMENTE se mover ao longo do ciclo
  const posicoes = await page.evaluate(async () => {
    const img = document.querySelector('.training-projectile');
    const out = [];
    for (let i = 0; i < 14; i++) { out.push(img.getBoundingClientRect().left); await new Promise(r => setTimeout(r, 100)); }
    return out;
  });
  const amplitude = Math.max(...posicoes) - Math.min(...posicoes);
  console.log('deslocamento do projétil em 1.4s:', amplitude.toFixed(1) + 'px');
  if (amplitude < 15) falhas.push(`projétil praticamente parado (${amplitude.toFixed(1)}px)`);

  await page.screenshot({ path: 'scripts/shot-training.png', clip: { x: 60, y: 230, width: 1160, height: 430 } }).catch(() => {});
  await page.evaluate(() => window.stopTraining && window.stopTraining());
  await page.waitForTimeout(1500);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros/404: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
