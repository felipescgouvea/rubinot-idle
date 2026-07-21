// Teste do Treino Online:
//   1. Paladino tem Distance E Magic Level (com seletor de magia)
//   2. Com o treino online ativo, o projétil existe, é sprite REAL (carregou),
//      está animado e de fato SE MOVE
// Usa o slot 1 da conta de teste pro Paladino (o slot 0 é o Knight).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', r => { if (r.status() === 404 && /sprites/.test(r.url())) errs.add('404 ' + r.url().split('/').pop()); });
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  let est = await instalarLiveImport(page);
  console.log('estado:', JSON.stringify(est));

  // garante que estamos num slot VAZIO pra criar o Paladino sem tocar no Knight
  if (est.voc && est.voc !== 'paladin') {
    await page.evaluate(async () => {
      const acc = await window.__liveImport('accountUseCases.js');
      window.confirm = () => true;
      acc.confirmSwitchCharacterSlot(1);
    });
    await page.waitForTimeout(9000);
    await login(page, acct);
    await instalarLiveImport(page);
    est = await page.evaluate(() => ({ slot: window.__ACC.activeSlot, voc: window.__G.vocation }));
    console.log('depois de trocar de slot:', JSON.stringify(est));
  }

  if (!est.voc) {
    const r = await page.evaluate(async () => {
      const input = document.getElementById('char-name-input');
      if (!input || input.offsetParent === null) return 'sem campo de nome';
      input.value = 'AuditPala';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await window.createCharacter('paladin');
      return 'chamou createCharacter';
    });
    console.log('criação:', r);
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 20000 }).catch(() => {});
  }
  const voc = await page.evaluate(() => window.__G.vocation);
  console.log('vocação ativa:', voc);
  if (voc !== 'paladin') { falhas.push(`esperava paladin, veio ${voc}`); throw new Error('sem paladino, teste abortado'); }

  // ---- 1) treino online mostra Distance E Magic Level ----
  // As abas são trocadas por CLIQUE (não há função global) — sem isso o painel
  // fica com display:none e todo getBoundingClientRect volta zerado.
  await page.click('.tab[data-tab="training"]');
  await page.waitForTimeout(1200);
  // Pode ter ficado um treino ativo de uma rodada anterior: nesse caso o painel
  // mostra o cartão em andamento, não a seleção de skill.
  await page.evaluate(() => { if (window.__G.trainingSkill) window.stopTraining(); });
  await page.waitForFunction(() => !window.__G.trainingSkill, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
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
  console.log('magias oferecidas:', painel.magias.join(', ') || '(nenhuma)');
  if (!painel.skills.some(s => /distance/i.test(s))) falhas.push('Distance Fighting sumiu do treino online do Paladino');
  if (!painel.temSeletorDeMagia) falhas.push('Paladino não tem seletor de Magic Level no treino online');
  if (!painel.magias.length) falhas.push('nenhuma magia de ataque listada pro Paladino');
  if (!painel.temSubhead) falhas.push('faltou o cabeçalho da seção de Magic Level');

  // ---- 2) projétil no treino de Distance ----
  await page.evaluate(() => window.startOnlineTraining('distance'));
  await page.waitForFunction(() => document.querySelector('.training-projectile'), null, { timeout: 20000 }).catch(() => {});
  // espera a sprite terminar de carregar antes de medir (senão naturalWidth
  // ainda é 0 e o teste acusa "não carregou" no que é só timing)
  await page.waitForFunction(() => {
    const i = document.querySelector('.training-projectile');
    return i && i.complete && i.naturalWidth > 0;
  }, null, { timeout: 15000 }).catch(() => {});
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
      visivel: img.getBoundingClientRect().width > 0,
    };
  });
  console.log('projétil:', JSON.stringify(proj));
  if (!proj) falhas.push('nenhum projétil no treino online de Distance');
  else {
    if (!/arrow|bolt/.test(proj.src)) falhas.push(`projétil errado pro Distance: ${proj.src}`);
    if (!proj.carregou) falhas.push('a sprite do projétil não carregou');
    if (!proj.visivel) falhas.push('o projétil não está visível (largura 0)');
    if (proj.animacao === 'none') falhas.push('o projétil não está animado');
    if (proj.dummyAnimado === 'none') falhas.push('o boneco não reage ao impacto');

    const posicoes = await page.evaluate(async () => {
      const img = document.querySelector('.training-projectile');
      const out = [];
      for (let i = 0; i < 16; i++) { out.push(img.getBoundingClientRect().left); await new Promise(r => setTimeout(r, 100)); }
      return out;
    });
    const amplitude = Math.max(...posicoes) - Math.min(...posicoes);
    console.log('deslocamento do projétil ao longo de 1.6s:', amplitude.toFixed(1) + 'px');
    if (amplitude < 15) falhas.push(`projétil praticamente parado (${amplitude.toFixed(1)}px)`);
  }

  const card = await page.$('.training-active');
  if (card) await card.screenshot({ path: 'scripts/shot-training.png' }).catch(() => {});
  await page.evaluate(() => window.stopTraining && window.stopTraining());
  await page.waitForTimeout(1500);
} catch (e) {
  if (!/teste abortado/.test(e.message)) falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros/404: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
