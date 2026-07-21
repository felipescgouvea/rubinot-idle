// AUDITORIA do Treino Online: o progresso sobrevive a fechar e reabrir a aba?
//
// Mede a verdade (tries da skill em player_skills, via /hunt/state) em quatro
// momentos, sempre pelo servidor — nunca pelo que o painel mostra:
//   A. logo depois de iniciar
//   B. depois de treinar um tempo com a aba ABERTA
//   C. depois de "fechar a aba" (recarregar a página, que mata os timers)
//   D. depois de reabrir e deixar assentar
//
// O que NÃO pode acontecer: C < B (perdeu o que já estava creditado) ou
// C == B quando houve tempo relevante entre o último tick e o fechamento.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ABERTO = +(process.argv[2] || 40);   // segundos treinando com a aba aberta
const FECHADO = +(process.argv[3] || 45);  // segundos com a aba "fechada"

const browser = await chromium.launch({ headless: true });
const errs = new Set();
const falhas = [];

const novaAba = async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 150)));
  await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(p, acct);
  await instalarLiveImport(p);
  return p;
};

// Progresso CUMULATIVO da skill: (nível, tries) sozinho não serve de métrica —
// ao subir de nível as tries voltam a zero e um teste ingênuo lê isso como
// "perdeu todo o progresso" (foi o que aconteceu na 1ª versão). Aqui somamos o
// custo de todos os níveis já vencidos + as tries do nível atual.
const lerTries = async (p, skill) => p.evaluate(async s => {
  const ac = await window.__liveImport('authClient.js');
  const st = await ac.getHuntState(window.__ACC.activeSlot);
  const sk = st && st.skills && st.skills[s];
  const stats = st && st.stats;
  const ch = await window.__liveImport('character.js');
  let total = null;
  if (sk) {
    total = sk.tries;
    const base = ch.createDefaultSkills()[s] ? ch.createDefaultSkills()[s].lv : 10;
    for (let l = base; l < sk.lv; l++) total += ch.triesForNext(window.__G.vocation, s, l);
  }
  return {
    lv: sk ? sk.lv : null,
    tries: sk ? sk.tries : null,
    total,
    treinando: stats ? stats.training_skill : null,
    modo: stats ? stats.training_mode : null,
    desde: stats && stats.training_since ? new Date(stats.training_since).getTime() : null,
  };
}, skill);

try {
  let page = await novaAba();
  let est = await page.evaluate(() => ({ voc: window.__G.vocation }));
  if (!est.voc) {
    await page.evaluate(async () => {
      const i = document.getElementById('char-name-input');
      if (i) { i.value = 'AuditTrn'; i.dispatchEvent(new Event('input', { bubbles: true })); }
      await window.createCharacter('knight');
    });
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 25000 }).catch(() => {});
  }
  const skill = await page.evaluate(async () => {
    const tr = await window.__liveImport('training.js');
    return tr.onlineTrainableSkills(window.__G.vocation).filter(s => s !== 'magic')[0];
  });
  console.log('vocação:', await page.evaluate(() => window.__G.vocation), '| skill:', skill);

  await page.evaluate(() => { if (window.__G.trainingSkill) window.stopTraining(); });
  await page.waitForTimeout(2500);
  await page.evaluate(s => window.startOnlineTraining(s), skill);
  await page.waitForFunction(() => window.__G.trainingSkill && window.__G.trainingMode === 'online', null, { timeout: 20000 }).catch(() => {});

  const A = await lerTries(page, skill);
  console.log(`\nA) ao iniciar          : lv ${A.lv} tries ${A.tries} | treinando=${A.treinando}/${A.modo}`);
  if (A.treinando !== skill) falhas.push('o servidor não registrou o treino ao iniciar');

  await page.waitForTimeout(ABERTO * 1000);
  const B = await lerTries(page, skill);
  console.log(`B) após ${String(ABERTO).padStart(3)}s ABERTA    : lv ${B.lv} tries ${B.tries} | acumulado ${B.total}  (+${B.total - A.total})`);
  if (B.total <= A.total) falhas.push(`treinou ${ABERTO}s com a aba aberta e NÃO creditou nada`);

  // "fecha a aba": mata a página (os timers morrem junto), espera, e reabre
  await page.close();
  console.log(`   ... aba fechada por ${FECHADO}s ...`);
  await new Promise(r => setTimeout(r, FECHADO * 1000));

  page = await novaAba();
  const C = await lerTries(page, skill);
  console.log(`C) ao REABRIR          : lv ${C.lv} tries ${C.tries} | acumulado ${C.total}  (${C.total - B.total >= 0 ? '+' : ''}${C.total - B.total} vs B)`);
  if (C.total < B.total) falhas.push(`PERDEU progresso ao reabrir: acumulado ${B.total} -> ${C.total}`);
  if (C.treinando !== skill) falhas.push('o treino não continuou ativo depois de reabrir');

  await page.waitForTimeout(12000);
  const D = await lerTries(page, skill);
  console.log(`D) 12s depois de reabrir: lv ${D.lv} tries ${D.tries} | acumulado ${D.total}  (+${D.total - C.total} vs C)`);
  if (D.total <= C.total) falhas.push('depois de reabrir, o treino parou de creditar');

  // Quanto do tempo fechado foi aproveitado? Compara com o ritmo medido aberto.
  const porSegAberto = (B.total - A.total) / ABERTO;
  const creditadoFechado = C.total - B.total;
  const esperadoFechado = porSegAberto * FECHADO;
  console.log(`\nritmo com a aba aberta : ${porSegAberto.toFixed(2)} tries/s`);
  console.log(`tempo fechado          : ${FECHADO}s -> creditou ${creditadoFechado}, no ritmo daria ~${esperadoFechado.toFixed(0)}`);
  console.log(`aproveitamento         : ${esperadoFechado > 0 ? ((creditadoFechado / esperadoFechado) * 100).toFixed(0) : '—'}%`);
  if (esperadoFechado > 3 && creditadoFechado < esperadoFechado * 0.5) {
    falhas.push(`só ${((creditadoFechado / esperadoFechado) * 100).toFixed(0)}% do tempo de aba fechada foi creditado`);
  }

  await page.evaluate(() => window.stopTraining && window.stopTraining());
  await page.waitForTimeout(2000);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
