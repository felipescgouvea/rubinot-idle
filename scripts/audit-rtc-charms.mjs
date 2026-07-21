// AUDITORIA do RTC (cura/ataque automáticos) e dos CHARMS.
//
// RTC é a mecânica que decide se o personagem sobrevive sozinho — e já quebrou
// antes de um jeito silencioso (o servidor lia o RTC só no início da caçada, e
// mudar o gatilho no meio não tinha efeito). O teste aqui não pergunta "o
// painel salvou?", e sim: levando dano de verdade, o personagem SE CURA?
//
// Charms: os pontos agora vêm da Arena (ver rewardGrants.js). Verifica que dá
// pra desbloquear e equipar, e que os pontos são debitados.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'troll_cave';
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
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    window.__LOG = [];
    bus.on(bus.EVENTS.LOG, m => window.__LOG.push((typeof m === 'string' ? m : (m && m.html) || '').replace(/<[^>]*>/g, '')));
  });
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ---------- RTC: a cura automática dispara em combate? ----------
  const config = await page.evaluate(async () => {
    const ru = await window.__liveImport('rtcUseCases.js');
    const sp = await window.__liveImport('spells.js');
    // Gatilho BEM alto pra cura disparar ao primeiro arranhão.
    if (typeof ru.setRtcThreshold === 'function') ru.setRtcThreshold('healSpellThreshold', 95);
    const cura = Object.entries(sp.SPELLS).find(([id, s]) => s.type === 'heal'
      && s.voc.includes(window.__G.vocation) && window.__G.level >= s.level);
    if (cura && typeof ru.setRtcHealSpell === 'function') ru.setRtcHealSpell(cura[0]);
    else if (cura) window.__G.rtc.healSpell = cura[0];
    await new Promise(r => setTimeout(r, 800));
    return { magia: cura ? cura[0] : null, gatilho: window.__G.rtc.healSpellThreshold, mana: window.__G.mana };
  });
  console.log(`RTC configurado: cura=${config.magia || 'NENHUMA disponível'} · gatilho=${config.gatilho}% · mana=${config.mana}`);
  if (!config.magia) falhas.push('a vocação não tem magia de cura disponível no nível atual — RTC não testável');
  else {
    await page.evaluate(async z => {
      window.__H.selectZone(z);
      await new Promise(r => setTimeout(r, 800));
      await window.__H.startHunt();
    }, ZONA);
    await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});

    // amostra o HP durante a luta: o que interessa e HP SUBINDO no meio do combate
    const amostras = await page.evaluate(async () => {
      const out = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 75000) {
        out.push({ hp: window.__G.hp, mana: window.__G.mana, emLuta: (window.__H.getCurrentPack() || []).length > 0 });
        await new Promise(r => setTimeout(r, 400));
      }
      return out;
    });
    await page.evaluate(() => window.__G.hunting && window.toggleHunt());
    await page.waitForTimeout(1500);

    const log = await page.evaluate(() => window.__LOG || []);
    // A linha real da cura por RTC e:  💊 [RTC] "exura infir ico": +10 HP (-6 mana)
    // A versao anterior EXCLUIA linhas contendo "mana" — ou seja, jogava fora
    // justamente a linha que procurava. E como agora existe regeneracao passiva,
    // "HP subiu" sozinho NAO prova que a cura disparou: a linha e a unica prova.
    // Formato REAL emitido pelo caminho server-truth (huntUseCases:
    // renderCombatEvents, kind 'heal'):   💚 "exura infir ico" +10
    // Nao tem a tag [RTC] nem a palavra HP — essas sao da chave log.rtcHealSpell,
    // do caminho ANTIGO client-side. Procurar por elas nao achava nada.
    const linhasCura = log.filter(l => /💚/.test(l) || /\[RTC\][^]*\+\d+\s*HP/i.test(l));
    const tomouDano = amostras.some((a, i) => i && a.hp < amostras[i - 1].hp);
    let subidasEmLuta = 0;
    for (let i = 1; i < amostras.length; i++) {
      if (amostras[i].emLuta && amostras[i].hp > amostras[i - 1].hp) subidasEmLuta++;
    }
    // Qual foi o PIOR momento de vida? Se o HP nunca cruzou o gatilho, a cura
    // nao disparar e o comportamento CERTO — ainda mais agora que existe
    // regeneracao passiva segurando a vida perto do teto.
    const maxHp = await page.evaluate(async () => (await window.__liveImport('stats.js')).getMaxHp());
    const menorHp = Math.min(...amostras.map(a => a.hp));
    const pctMinimo = Math.round((menorHp / maxHp) * 100);
    console.log(`RTC: tomou dano=${tomouDano} | HP mínimo ${menorHp}/${maxHp} (${pctMinimo}%) | subidas em combate=${subidasEmLuta} | linhas de cura=${linhasCura.length}`);
    if (linhasCura.length) console.log('   ex.:', linhasCura.slice(-2).join(' // '));

    if (!tomouDano) console.log('RTC: INCONCLUSIVO — não levou dano na janela medida');
    else if (pctMinimo >= config.gatilho) {
      console.log(`RTC: INCONCLUSIVO — o HP nunca caiu abaixo do gatilho (${pctMinimo}% >= ${config.gatilho}%), então não havia motivo pra curar`);
    } else if (!linhasCura.length) {
      falhas.push(`RTC: o HP caiu a ${pctMinimo}% (gatilho ${config.gatilho}%) e a cura NUNCA disparou — subida de HP não conta, pode ser só regeneração passiva`);
    } else ok.push('RTC (cura automática)');
  }

  // ---------- CHARMS ----------
  const charms = await page.evaluate(async () => {
    const cu = await window.__liveImport('bestiaryUseCases.js').catch(() => null);
    const ch = await window.__liveImport('charms.js');
    const pontos = window.__G.charmPoints || 0;
    const jaTem = window.__G.charmsUnlocked || [];
    const lista = Object.entries(ch.CHARMS || {});
    if (!lista.length) return { erro: 'nenhum charm no catálogo' };
    const alvo = lista.find(([id, c]) => !jaTem.includes(id) && (c.cost || 0) <= pontos);
    if (!alvo) return { pulado: `sem charm acessível (${pontos} pontos; o mais barato pede ${Math.min(...lista.map(([, c]) => c.cost || 0))})` };
    const fn = cu && cu.unlockCharm;   // nome real, conferido em bestiaryUseCases.js
    if (typeof fn !== 'function') return { erro: 'função de desbloquear charm não encontrada' };
    fn(alvo[0]);
    await new Promise(r => setTimeout(r, 1000));
    const desbloqueou = (window.__G.charmsUnlocked || []).includes(alvo[0]);
    let equipou = null;
    const eq = cu && cu.toggleCharmEquipped;   // nome real (nao equipCharm/toggleCharm)
    if (desbloqueou && typeof eq === 'function') {
      eq(alvo[0]);
      await new Promise(r => setTimeout(r, 800));
      equipou = (window.__G.charmsEquipped || []).includes(alvo[0]);
    }
    return { id: alvo[0], custo: alvo[1].cost, pontosAntes: pontos, pontosDepois: window.__G.charmPoints || 0, desbloqueou, equipou };
  });
  if (charms.erro) falhas.push('charms: ' + charms.erro);
  else if (charms.pulado) console.log('charms: pulado —', charms.pulado);
  else {
    console.log(`charms: ${charms.id} (custo ${charms.custo}) | pontos ${charms.pontosAntes}->${charms.pontosDepois} | desbloqueou=${charms.desbloqueou} equipou=${charms.equipou}`);
    if (!charms.desbloqueou) falhas.push(`charm ${charms.id}: não desbloqueou`);
    else {
      if (charms.pontosDepois >= charms.pontosAntes) falhas.push(`charm ${charms.id}: desbloqueou sem debitar os pontos`);
      else ok.push('desbloquear charm');
      if (charms.equipou === false) falhas.push(`charm ${charms.id}: desbloqueou mas não equipou`);
      else if (charms.equipou) ok.push('equipar charm');
    }
  }
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 200));
} finally {
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
