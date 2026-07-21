// Testa o Treino Online de MAGIC LEVEL no Paladino — o caso que o Felipe
// reportou: com magia de cura escolhida, o botão "Iniciar Treino Online" não
// fazia nada. Precisa de um Paladino, então usa/cria um no slot 1.
//
// Confere: a lista traz as magias de cura E de ataque; dá pra escolher uma que
// o nível permite; o botão realmente inicia; e o palco do mago sobe com efeito.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  let est = await instalarLiveImport(page);

  // Cria o Paladino no slot ativo se estiver vazio. NÃO troca de slot: a troca
  // recarrega a página e deixava a conta de teste inconsistente entre rodadas.
  if (!est.voc) {
    await page.evaluate(async () => {
      const input = document.getElementById('char-name-input');
      if (input) {
        input.value = 'AuditPala';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await window.createCharacter('paladin');
    });
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 25000 }).catch(() => {});
    est = await instalarLiveImport(page);
  }
  console.log('vocação:', est.voc, '| slot', est.slot, '| nível', await page.evaluate(() => window.__G.level));
  if (est.voc !== 'paladin') { falhas.push(`precisava do Paladino, veio ${est.voc}`); throw new Error('abortado'); }

  // clique via JS: o chrome do jogo às vezes tem overlay por cima e o
  // click "de verdade" do Playwright fica em retry até estourar
  await page.evaluate(() => document.querySelector('.tab[data-tab="training"]').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (window.__G.trainingSkill) window.stopTraining(); });
  await page.waitForFunction(() => !window.__G.trainingSkill, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  const lista = await page.evaluate(() => [...document.querySelectorAll('.training-spell-btn')].map(b => ({
    nome: b.querySelector('span') ? b.querySelector('span').textContent.trim() : b.textContent.trim(),
    travada: b.disabled,
  })));
  console.log('magias oferecidas:', lista.length);
  lista.forEach(s => console.log(`   ${s.travada ? '🔒' : '  '} ${s.nome}`));
  const liberadas = lista.filter(s => !s.travada);
  if (!lista.length) falhas.push('nenhuma magia listada pra treinar Magic Level');
  if (!liberadas.length) falhas.push('TODAS as magias apareceram travadas — não dá pra treinar ML');

  // escolhe a primeira liberada e aperta o botão
  const escolhida = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.training-spell-btn')].find(x => !x.disabled);
    if (!b) return null;
    b.click();
    return b.querySelector('span') ? b.querySelector('span').textContent.trim() : b.textContent.trim();
  });
  console.log('magia escolhida:', escolhida);
  await page.waitForTimeout(600);

  // captura avisos e respostas do servidor durante o clique
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    window.__MSGS = [];
    bus.on(bus.EVENTS.NOTIFY, m => window.__MSGS.push(typeof m === 'string' ? m : m.msg));
  });
  page.on('response', async r => { if (/train/.test(r.url())) console.log('   HTTP', r.status(), r.url().split('/').pop(), (await r.text().catch(() => '')).slice(0, 160)); });

  const botao = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#online-training-body button')]
      .find(x => /treino online|online training/i.test(x.textContent));
    if (!b) return { achou: false };
    if (b.disabled) return { achou: true, desabilitado: true };
    b.click();
    return { achou: true, desabilitado: false };
  });
  if (!botao.achou) falhas.push('botão "Iniciar Treino Online" não encontrado');
  else if (botao.desabilitado) falhas.push('botão continua desabilitado depois de escolher a magia');

  const comecou = await page.waitForFunction(
    () => window.__G.trainingSkill === 'magic' && window.__G.trainingMode === 'online',
    null, { timeout: 20000 }
  ).then(() => true).catch(() => false);
  console.log('treino de Magic Level iniciou:', comecou);
  console.log('avisos:', JSON.stringify(await page.evaluate(() => window.__MSGS)));
  if (!comecou) falhas.push('o botão não iniciou o treino de Magic Level (o bug reportado)');

  if (comecou) {
    const palco = await page.waitForFunction(
      () => document.querySelector('#online-training-body .training-stage.tstage-mage'),
      null, { timeout: 15000 }
    ).then(() => true).catch(() => false);
    // espera o sprite do efeito terminar de carregar antes de medir (senão o
    // teste acusa "não carregou" só por ter olhado cedo demais)
    await page.waitForFunction(() => {
      const c = document.querySelector('.tstage-cast');
      return c && c.complete && c.naturalWidth > 0;
    }, null, { timeout: 15000 }).catch(() => {});
    const cena = await page.evaluate(() => {
      const c = document.querySelector('.tstage-cast');
      return {
        palcoMago: !!document.querySelector('.training-stage.tstage-mage'),
        semDummy: !document.querySelector('.tstage-dummy'),
        efeito: c ? c.getAttribute('src').split('/').pop() : null,
        efeitoCarregou: c ? (c.complete && c.naturalWidth > 0) : false,
        magiaEmUso: window.__G.trainingSpell,
      };
    });
    console.log('palco:', JSON.stringify(cena));
    if (!palco || !cena.palcoMago) falhas.push('palco do mago não apareceu');
    if (!cena.semDummy) falhas.push('palco do mago não pode ter dummy');
    if (!cena.efeito) falhas.push('sem efeito de magia no palco');
    else if (!cena.efeitoCarregou) falhas.push('o sprite do efeito não carregou');
    if (!cena.magiaEmUso) falhas.push('treino iniciou sem registrar a magia escolhida');
    const el = await page.$('.training-stage');
    if (el) await el.screenshot({ path: 'scripts/shot-mltrain.png' }).catch(() => {});
    await page.evaluate(() => window.stopTraining && window.stopTraining());
    await page.waitForTimeout(1500);
  }
} catch (e) {
  if (!/abortado/.test(e.message)) falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
