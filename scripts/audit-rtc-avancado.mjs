// AUDITORIA DO RTC AVANÇADO — degraus de cura, prioridade de alvo e a regra
// de área vs alvo único.
//
// São três regras que decidem sozinhas o combate do jogador. Se qualquer uma
// delas só existir na tela e não no motor, o jogador configura, acredita, e
// perde caçada — foi exatamente o que aconteceu com o prey. Aqui cada regra é
// medida no COMPORTAMENTO, não na configuração:
//
//   1. degraus de cura  -> a magia certa é castada pro HP% certo
//   2. prioridade alvo  -> quem leva dano é quem a regra manda
//   3. área vs single   -> a escolha muda conforme o tamanho da sala
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'rat_cave';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const erros = new Set();
page.on('pageerror', e => erros.add('PAGEERR ' + e.message.slice(0, 150)));
const falhas = [];
const ok = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ---------- 1. DEGRAUS DE CURA (regra pura) ----------
  const degraus = await page.evaluate(async () => {
    const rc = await window.__liveImport('rtcConfig.js');
    const rtc = { healTiers: [{ spell: 'a', pct: 70 }, { spell: 'c', pct: 25 }, { spell: 'b', pct: 45 }] };
    const escolhas = [95, 60, 35, 20].map(hp => {
      const t = rc.pickHealTier(rtc, hp);
      return { hp, spell: t ? t.spell : null };
    });
    // sem NADA configurado tem que continuar curando (cura padrão da vocação)
    const semConfig = rc.pickHealTier({ healSpellThreshold: 40 }, 30);
    const semConfigCheio = rc.pickHealTier({ healSpellThreshold: 40 }, 90);
    return { escolhas, semConfig, semConfigCheio };
  });
  const esperado = { 95: null, 60: 'a', 35: 'b', 20: 'c' };
  const errados = degraus.escolhas.filter(e => e.spell !== esperado[e.hp]);
  console.log('degraus 70/45/25 -> ' + degraus.escolhas.map(e => `${e.hp}%:${e.spell || '(nenhum)'}`).join('  '));
  if (errados.length) falhas.push(`degrau errado: ${errados.map(e => `HP ${e.hp}% escolheu ${e.spell}, esperado ${esperado[e.hp]}`).join(' | ')}`);
  else ok.push('degrau escolhido pelo HP');
  // A volta pro padrão é o que impede a regressão fatal: quem nunca abriu o
  // painel não pode parar de se curar ao subir a versão.
  if (!degraus.semConfig) falhas.push('sem degrau configurado o personagem NÃO se cura — regressão fatal pra quem nunca abriu o painel');
  else if (degraus.semConfigCheio) falhas.push('sem degrau configurado ele cura mesmo com HP cheio');
  else ok.push('volta pra cura padrão sem configuração');

  // ---------- 2. PRIORIDADE DE ALVO (comportamento no combate) ----------
  // Com 'lowestHp' e uma sala cheia, o dano tem que cair em quem tem MENOS
  // vida — e não no primeiro da fila, que era o comportamento antigo.
  const alvo = await page.evaluate(async z => {
    const ru = await window.__liveImport('rtcUseCases.js');
    const hu = await window.__liveImport('huntUseCases.js');
    ru.setRtcTargetPriority('lowestHp');
    await new Promise(r => setTimeout(r, 800));
    hu.selectZone(z);
    await new Promise(r => setTimeout(r, 700));
    if (hu.setDensity) hu.setDensity('pack');   // sala cheia pra haver escolha
    await hu.startHunt();
    await new Promise(r => setTimeout(r, 3000));

    // Amostra a sala: a cada leitura, quem PERDEU vida desde a anterior era o
    // menor HP da leitura passada?
    let acertos = 0, testes = 0;
    let anterior = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 70000) {
      const pack = (hu.getCurrentPack() || []).filter(m => m.hp > 0).map(m => ({ uid: String(m.uid), hp: m.hp }));
      if (anterior && anterior.length > 1 && pack.length > 1) {
        const antesMap = new Map(anterior.map(m => [m.uid, m.hp]));
        const feridos = pack.filter(m => antesMap.has(m.uid) && m.hp < antesMap.get(m.uid));
        if (feridos.length === 1) {   // só conta golpe de alvo único
          const menor = anterior.reduce((a, b) => (b.hp < a.hp ? b : a));
          testes++;
          if (feridos[0].uid === menor.uid) acertos++;
        }
      }
      anterior = pack;
      await new Promise(r => setTimeout(r, 400));
    }
    return { acertos, testes, prio: window.__G.rtc.targetPriority };
  }, ZONA);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  console.log(`prioridade "${alvo.prio}": em ${alvo.testes} golpes de alvo único, ${alvo.acertos} caíram no de menor vida`);
  if (alvo.testes < 4) {
    console.log('prioridade de alvo: INCONCLUSIVO — a sala quase nunca teve mais de um bicho vivo');
  } else {
    const pct = alvo.acertos / alvo.testes;
    console.log(`   ${(pct * 100).toFixed(0)}% de acerto`);
    // Não exijo 100%: o alvo pode morrer entre duas leituras e o golpe seguinte
    // já ir pro próximo, o que conta como "erro" sem ser.
    if (pct < 0.7) falhas.push(`prioridade "menor vida" não está sendo respeitada: só ${(pct * 100).toFixed(0)}% dos golpes foram no mais ferido`);
    else ok.push('prioridade de alvo');
  }

  // ---------- 3. ÁREA vs ALVO ÚNICO (regra pura) ----------
  const area = await page.evaluate(async () => {
    const rc = await window.__liveImport('rtcConfig.js');
    const cands = [{ n: 'single', area: false }, { n: 'area', area: true }];
    const eh = c => c.area;
    return {
      salaDe1: rc.orderByPackSize(cands, 1, 2, eh)[0].n,
      salaDe4: rc.orderByPackSize(cands, 4, 2, eh)[0].n,
      desligado: rc.orderByPackSize(cands, 4, 0, eh)[0].n,
      // sem candidato do tipo preferido, o outro tem que continuar valendo
      soSingleEmSalaCheia: rc.orderByPackSize([{ n: 'single', area: false }], 4, 2, eh).length,
    };
  });
  console.log(`área: sala de 1 -> ${area.salaDe1} · sala de 4 -> ${area.salaDe4} · regra desligada -> ${area.desligado}`);
  if (area.salaDe1 !== 'single') falhas.push(`com 1 bicho o RTC preferiu ${area.salaDe1} — desperdiça carga de área`);
  else if (area.salaDe4 !== 'area') falhas.push(`com 4 bichos o RTC preferiu ${area.salaDe4} — perde dano`);
  else if (area.desligado !== 'single') falhas.push('com a regra desligada a ordem de prioridade crua não foi respeitada');
  else if (area.soSingleEmSalaCheia !== 1) falhas.push('sem candidato de área o RTC DESCARTOU o de alvo único — ficaria sem atacar');
  else ok.push('área vs alvo único');
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 250));
} finally {
  await page.evaluate(() => { if (window.__G && window.__G.hunting) window.toggleHunt(); }).catch(() => {});
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
