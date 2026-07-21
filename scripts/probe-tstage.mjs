// Teste do PALCO do Treino Online (ui/trainingStage.js).
//
// Parte A — as três montagens, renderizadas pelo módulo REAL na página real
// (o palco é função pura do skill, então dá pra exercitar todas sem precisar de
// um personagem de cada vocação):
//   distance -> dummy + flecha que SAI do boneco e CHEGA no dummy
//   sword    -> dummy, SEM projétil (o boneco avança)
//   magic    -> SEM dummy, com o efeito real da magia
// Parte B — integração de verdade: inicia o treino online do personagem da
// conta e confere que o painel monta o palco com o boneco desenhado.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', r => { if (r.status() === 404 && /(sprites|outfits)/.test(r.url())) errs.add('404 ' + r.url().split('/').pop()); });
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  const est = await instalarLiveImport(page);
  console.log('personagem da conta:', est.voc, '| slot', est.slot);

  // ---------- PARTE A: as três montagens ----------
  await page.evaluate(async () => {
    const ts = await window.__liveImport('trainingStage.js');
    const sp = await window.__liveImport('spells.js');
    window.__TS = ts;
    window.__SPELL = Object.values(sp.SPELLS).find(s => s.type === 'attack' && s.element === 'holy')
                  || Object.values(sp.SPELLS).find(s => s.type === 'attack');
    const host = document.createElement('div');
    host.id = 'probe-stages';
    host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;display:flex;gap:8px;background:#222;padding:8px';
    document.body.appendChild(host);
  });

  const casos = [
    { skill: 'distance', comSpell: false, esperaDummy: true, esperaMissil: true, esperaEfeito: false },
    { skill: 'sword', comSpell: false, esperaDummy: true, esperaMissil: false, esperaEfeito: false },
    { skill: 'magic', comSpell: true, esperaDummy: false, esperaMissil: false, esperaEfeito: true },
  ];

  for (const c of casos) {
    await page.evaluate(({ skill, comSpell }) => {
      const host = document.getElementById('probe-stages');
      host.innerHTML = window.__TS.trainingStageHtml(skill, comSpell ? window.__SPELL : null);
      window.__TS.mountTrainingStagePlayer(skill);
    }, c);
    await page.waitForFunction(() => {
      const st = document.querySelector('#probe-stages .training-stage');
      if (!st) return false;
      const imgs = [...st.querySelectorAll('img')];
      return !!st.querySelector('.tstage-player-canvas') && imgs.every(i => i.complete && i.naturalWidth > 0);
    }, null, { timeout: 20000 }).catch(() => {});

    const r = await page.evaluate(async () => {
      const st = document.querySelector('#probe-stages .training-stage');
      const sr = st.getBoundingClientRect();
      const dummy = st.querySelector('.tstage-dummy img');
      const player = st.querySelector('.tstage-player');
      const miss = st.querySelector('.tstage-missile');
      const cast = st.querySelector('.tstage-cast');
      const traj = [];
      if (miss) {
        for (let i = 0; i < 24; i++) {
          traj.push({ y: miss.getBoundingClientRect().top - sr.top, op: +getComputedStyle(miss).opacity });
          await new Promise(x => setTimeout(x, 65));
        }
      }
      const quebradas = [...st.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0)
        .map(i => i.getAttribute('src').split('/').pop());
      return {
        boneco: !!st.querySelector('.tstage-player-canvas'),
        dummy: !!dummy,
        missil: miss ? miss.getAttribute('src').split('/').pop() : null,
        efeito: cast ? cast.getAttribute('src').split('/').pop() : null,
        efeitoAnim: cast ? getComputedStyle(cast).animationName : null,
        dummyY: dummy ? +(dummy.getBoundingClientRect().top - sr.top).toFixed(0) : null,
        playerY: player ? +(player.getBoundingClientRect().top - sr.top).toFixed(0) : null,
        quebradas,
        traj,
      };
    });

    const ys = r.traj.filter(p => p.op > 0.2).map(p => p.y);
    const amplitude = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    console.log(`\n[${c.skill}] boneco=${r.boneco} dummy=${r.dummy} missil=${r.missil || '-'} efeito=${r.efeito || '-'}`);
    if (r.dummy) console.log(`   dummy y=${r.dummyY} | boneco y=${r.playerY} (dummy à frente: ${r.dummyY < r.playerY})`);
    if (ys.length) console.log(`   trajetória do projétil: ${amplitude.toFixed(0)}px (de y=${Math.max(...ys).toFixed(0)} até y=${Math.min(...ys).toFixed(0)})`);

    if (!r.boneco) falhas.push(`[${c.skill}] boneco não foi desenhado`);
    if (r.quebradas.length) falhas.push(`[${c.skill}] sprites que não carregaram: ${r.quebradas.join(', ')}`);
    if (c.esperaDummy && !r.dummy) falhas.push(`[${c.skill}] faltou o dummy`);
    if (!c.esperaDummy && r.dummy) falhas.push(`[${c.skill}] NÃO devia ter dummy`);
    if (c.esperaMissil) {
      if (!r.missil) falhas.push(`[${c.skill}] faltou o projétil`);
      else {
        if (!/arrow|bolt/.test(r.missil)) falhas.push(`[${c.skill}] projétil errado: ${r.missil}`);
        if (amplitude < 30) falhas.push(`[${c.skill}] projétil quase não anda (${amplitude.toFixed(0)}px)`);
        if (Math.min(...ys) > r.dummyY + 26) falhas.push(`[${c.skill}] projétil não alcança o dummy`);
        if (Math.max(...ys) < r.playerY - 34) falhas.push(`[${c.skill}] projétil não parte do boneco`);
      }
    }
    if (!c.esperaMissil && r.missil) falhas.push(`[${c.skill}] NÃO devia ter projétil`);
    if (c.esperaEfeito) {
      if (!r.efeito) falhas.push(`[${c.skill}] faltou o efeito da magia`);
      else if (r.efeitoAnim === 'none') falhas.push(`[${c.skill}] efeito da magia não animado`);
    }
    if (r.dummy && !(r.dummyY < r.playerY)) falhas.push(`[${c.skill}] o dummy não está à frente do boneco`);

    const el = await page.$('#probe-stages .training-stage');
    if (el) await el.screenshot({ path: `scripts/shot-tstage-${c.skill}.png` }).catch(() => {});
  }

  // ---------- PARTE B: integração pelo painel ----------
  await page.evaluate(() => { const h = document.getElementById('probe-stages'); if (h) h.remove(); });
  await page.click('.tab[data-tab="training"]');
  await page.waitForTimeout(900);
  await page.evaluate(() => { if (window.__G.trainingSkill) window.stopTraining(); });
  await page.waitForFunction(() => !window.__G.trainingSkill, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const skillReal = await page.evaluate(async () => {
    const tr = await window.__liveImport('training.js');
    return tr.onlineTrainableSkills(window.__G.vocation).filter(s => s !== 'magic')[0] || null;
  });
  console.log('\n[integração] treinando', skillReal, 'pelo painel');
  await page.evaluate(s => window.startOnlineTraining(s), skillReal);
  await page.waitForFunction(() => document.querySelector('#online-training-body .training-stage .tstage-player-canvas'), null, { timeout: 20000 })
    .then(() => console.log('   palco montado com o boneco desenhado: sim'))
    .catch(() => falhas.push('[integração] o painel não montou o palco com o boneco'));
  const card = await page.$('.training-active');
  if (card) await card.screenshot({ path: 'scripts/shot-training.png' }).catch(() => {});
  await page.evaluate(() => window.stopTraining && window.stopTraining());
  await page.waitForTimeout(1200);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros/404: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
