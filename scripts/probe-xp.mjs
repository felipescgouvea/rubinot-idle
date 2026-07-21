// Auditoria de XP por morte: caça numa zona e confere que TODA criatura que
// morre credita XP e aparece no log. O Felipe viu goblins morrendo sem dar XP.
//
// Mede três coisas independentes, pra separar "não creditou" de "não logou":
//   1. linhas de log de morte x linhas de "apareceu"
//   2. XP do personagem antes/depois (a verdade do crédito)
//   3. os eventos de morte crus que o servidor mandou
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'femor_hills';
const SEGS = +(process.argv[3] || 90);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  const est = await instalarLiveImport(page);
  console.log('personagem:', est.voc, 'lv', await page.evaluate(() => window.__G.level));

  // Espelha o log pelo barramento de eventos (o painel filtra por aba; aqui
  // queremos TUDO que foi emitido, senão um filtro esconderia o bug).
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    window.__LOG = [];
    bus.on(bus.EVENTS.LOG, p => window.__LOG.push(typeof p === 'string' ? p : (p && p.html) || ''));
  });

  await page.evaluate(async z => {
    if (window.__G.hunting) window.toggleHunt();
    await new Promise(r => setTimeout(r, 1500));
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 900));
    await window.__H.startHunt();
  }, ZONA);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});

  const antes = await page.evaluate(() => ({ xp: window.__G.xp, kills: window.__G.totalKills || 0 }));
  console.log('caçando em', ZONA, '— XP inicial', antes.xp);

  await page.waitForTimeout(SEGS * 1000);

  const depois = await page.evaluate(() => ({ xp: window.__G.xp, kills: window.__G.totalKills || 0 }));
  const linhas = await page.evaluate(() => window.__LOG.slice());
  await page.evaluate(() => window.toggleHunt && window.toggleHunt());
  await page.waitForTimeout(1200);

  const semTags = s => s.replace(/<[^>]*>/g, '');
  const mortes = linhas.filter(l => /morreu|died/i.test(semTags(l)));
  const surgiu = linhas.filter(l => /apareceu|appeared/i.test(semTags(l)));
  const xpGanho = depois.xp - antes.xp;
  const killsDelta = depois.kills - antes.kills;

  console.log(`\nlinhas de "apareceu": ${surgiu.length}`);
  console.log(`linhas de morte:      ${mortes.length}`);
  console.log(`kills contabilizados: ${killsDelta}`);
  console.log(`XP ganho:             ${xpGanho}`);
  console.log('\núltimas linhas de morte:');
  mortes.slice(-6).forEach(l => console.log('   ' + semTags(l).trim()));

  // Quem morreu segundo o log, e quanto XP cada um deu
  const porMonstro = {};
  for (const l of mortes) {
    const txt = semTags(l);
    const m = txt.match(/^\s*💀?\s*(.+?)\s+(?:morreu|died)/i);
    const xp = (txt.match(/\+(\d+)\s*XP/i) || [])[1];
    if (m) {
      const nome = m[1].trim();
      porMonstro[nome] = porMonstro[nome] || { n: 0, xpZero: 0 };
      porMonstro[nome].n++;
      if (!(+xp > 0)) porMonstro[nome].xpZero++;
    }
  }
  console.log('\nmortes por criatura:');
  Object.entries(porMonstro).forEach(([n, v]) => console.log(`   ${n.padEnd(22)} ${v.n} mortes${v.xpZero ? `  <-- ${v.xpZero} SEM XP` : ''}`));

  if (killsDelta > 0 && mortes.length === 0) falhas.push('matou criaturas mas NENHUMA linha de morte foi logada');
  if (mortes.length && killsDelta === 0) falhas.push('logou mortes mas o contador de kills não subiu');
  if (killsDelta > 0 && xpGanho <= 0) falhas.push(`matou ${killsDelta} criaturas e ganhou ${xpGanho} de XP`);
  Object.entries(porMonstro).forEach(([n, v]) => { if (v.xpZero) falhas.push(`${n}: ${v.xpZero} mortes sem XP`); });
  if (surgiu.length > 2 && mortes.length < surgiu.length / 3) {
    falhas.push(`muito mais "apareceu" (${surgiu.length}) do que mortes logadas (${mortes.length})`);
  }
  if (!surgiu.length && !mortes.length) falhas.push('nada aconteceu na caçada — teste inconclusivo');
  // Sem NENHUMA morte o teste não prova nada sobre o crédito de XP: pode ser só
  // um personagem fraco demais pra zona. Antes isso passava como sucesso.
  else if (!mortes.length && !killsDelta) falhas.push('nenhuma criatura morreu — INCONCLUSIVO (personagem fraco pra esta zona?)');
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
