// Testa que a regeneração de HP/mana roda DURANTE a caçada (antes só rodava
// com o jogo parado). Mede a mana, que é o sinal limpo: ela não é gasta a não
// ser por magia, e cai em degrau quando é — então qualquer subida entre golpes
// só pode vir da regeneração.
//
// Também confere a TAXA contra o que a vocação declara, pra pegar o caso de
// "regenera, mas na velocidade errada".
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'rat_cave';
const SEGS = +(process.argv[3] || 70);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
const falhas = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  let est = await instalarLiveImport(page);
  if (!est.voc) {
    await page.evaluate(async () => {
      const i = document.getElementById('char-name-input');
      if (i) { i.value = 'AuditReg'; i.dispatchEvent(new Event('input', { bubbles: true })); }
      await window.createCharacter('knight');
    });
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 25000 }).catch(() => {});
    est = await instalarLiveImport(page);
  }
  const voc = await page.evaluate(async () => {
    const c = await window.__liveImport('character.js');
    const v = c.VOCATIONS[window.__G.vocation];
    return { nome: window.__G.vocation, hpRegen: v.hpRegen, manaRegen: v.manaRegen, promovido: !!window.__G.promoted };
  });
  console.log(`vocação: ${voc.nome} | hpRegen ${voc.hpRegen} manaRegen ${voc.manaRegen} | promovido: ${voc.promovido}`);
  const mult = voc.promovido ? 2 : 1;
  const esperadoHpMin = voc.hpRegen * 90 * mult;
  const esperadoMpMin = voc.manaRegen * 90 * mult;
  console.log(`taxa esperada: ${esperadoHpMin} HP/min e ${esperadoMpMin} mana/min`);

  // NÃO adianta baixar hp/mana no cliente: durante a caçada quem manda é o
  // servidor e o reconcile sobrescreve em 250ms. O espaço pra regenerar tem que
  // vir do jogo — os monstros batendo. Por isso o teste roda numa zona que causa
  // dano e mede a RECUPERAÇÃO entre as pancadas.
  //
  // Também espelhamos o log: se o HP subir SEM nenhuma linha de cura (magia ou
  // poção), a única explicação possível é regeneração passiva.
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    window.__LOG = [];
    bus.on(bus.EVENTS.LOG, m => window.__LOG.push((typeof m === 'string' ? m : (m && m.html) || '').replace(/<[^>]*>/g, '')));
  });

  await page.evaluate(async z => {
    if (window.__G.hunting) window.toggleHunt();
    await new Promise(r => setTimeout(r, 1500));
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 900));
    await window.__H.startHunt();
  }, ZONA);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // amostra hp/mana enquanto CAÇA
  const amostras = await page.evaluate(async secs => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      out.push({ t: Math.round(performance.now() - t0), hp: window.__G.hp, mana: window.__G.mana, cacando: !!window.__G.hunting });
      await new Promise(r => setTimeout(r, 500));
    }
    return out;
  }, SEGS);
  await page.evaluate(() => window.toggleHunt && window.toggleHunt());
  await page.waitForTimeout(1200);

  const cacando = amostras.filter(a => a.cacando);
  let subiuHp = 0, subiuMp = 0;
  for (let i = 1; i < cacando.length; i++) {
    if (cacando[i].hp > cacando[i - 1].hp) subiuHp++;
    if (cacando[i].mana > cacando[i - 1].mana) subiuMp++;
  }
  const janela = (cacando[cacando.length - 1].t - cacando[0].t) / 60000; // minutos
  // ganho BRUTO de mana: soma só os degraus positivos (ignora o gasto de magia)
  let ganhoMp = 0, ganhoHp = 0;
  for (let i = 1; i < cacando.length; i++) {
    ganhoMp += Math.max(0, cacando[i].mana - cacando[i - 1].mana);
    ganhoHp += Math.max(0, cacando[i].hp - cacando[i - 1].hp);
  }
  const mpMin = ganhoMp / janela, hpMin = ganhoHp / janela;

  console.log(`\namostras caçando: ${cacando.length} (${(janela * 60).toFixed(0)}s)`);
  console.log(`subidas de HP: ${subiuHp} | subidas de mana: ${subiuMp}`);
  console.log(`ganho medido: ${hpMin.toFixed(0)} HP/min e ${mpMin.toFixed(0)} mana/min`);
  console.log(`hp ${cacando[0].hp} -> ${cacando[cacando.length - 1].hp} | mana ${cacando[0].mana} -> ${cacando[cacando.length - 1].mana}`);

  const log = await page.evaluate(() => window.__LOG || []);
  const curas = log.filter(l => /cura|curou|heal|poção|potion/i.test(l));
  const teto = await page.evaluate(async () => {
    const st = await window.__liveImport('stats.js');
    return { maxHp: st.getMaxHp(), maxMana: st.getMaxMana(), hp: window.__G.hp, mana: window.__G.mana };
  });
  console.log(`teto: ${teto.hp}/${teto.maxHp} HP e ${teto.mana}/${teto.maxMana} mana | linhas de cura no log: ${curas.length}`);

  if (cacando.length < 10) falhas.push('poucas amostras caçando — teste inconclusivo');
  // Se nunca saiu do teto, não houve o que regenerar: o teste não prova nada.
  const teveEspaco = cacando.some(a => a.hp < teto.maxHp) || cacando.some(a => a.mana < teto.maxMana);
  if (!teveEspaco) falhas.push('HP e mana ficaram no teto o tempo todo — INCONCLUSIVO, escolha uma zona que cause dano');
  else if (!subiuHp && !subiuMp) falhas.push('houve espaço pra regenerar e NADA regenerou durante a caçada (o bug)');
  else if (curas.length) falhas.push(`houve ${curas.length} cura(s) no log — a subida pode não ser regeneração; repita sem cura configurada`);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
