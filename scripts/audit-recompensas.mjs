// AUDITORIA DOS MODOS DE RECOMPENSA: Arena, Battle Pass, Boss Zone e Diária.
//
// Foco no que foi REESCRITO e nunca verificado de ponta a ponta: os prêmios
// deixaram de ser gold/Rubini/equipamento e passaram a ser boost, charm points,
// carta de presa e varinha de treino (ver application/rewardGrants.js). Aqui a
// pergunta é "o prêmio chegou de fato no save?", não "o botão respondeu".
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const erros = new Set();
page.on('pageerror', e => erros.add('PAGEERR ' + e.message.slice(0, 150)));
const falhas = [];
const ok = [];

// Retrato do que os prêmios podem tocar — nada material deve se mexer.
const carteira = () => page.evaluate(() => ({
  gold: window.__G.gold,
  rubini: window.__G.rubini,
  charm: window.__G.charmPoints || 0,
  preyCards: window.__G.preyCards || 0,
  boosts: { ...(window.__G.boosts || {}) },
  itens: Object.keys(window.__G.inventory || {}).length,
}));

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1200);
  const nivel = await page.evaluate(() => window.__G.level);
  console.log('nível do personagem:', nivel);

  // ---------- ARENA: uma luta paga em charm points, nunca em Rubini ----------
  const arena = await page.evaluate(async () => {
    const au = await window.__liveImport('arenaUseCases.js');
    if (au.arenaAttemptsLeft && au.arenaAttemptsLeft() <= 0) return { pulado: 'sem tentativas hoje' };
    const antes = { rubini: window.__G.rubini, charm: window.__G.charmPoints || 0, gold: window.__G.gold };
    const r = await au.startArenaBattle();
    await new Promise(x => setTimeout(x, 1200));
    return { antes, depois: { rubini: window.__G.rubini, charm: window.__G.charmPoints || 0, gold: window.__G.gold },
             semTentativa: !!(r && r.noAttemptsLeft) };
  });
  if (arena.pulado || arena.semTentativa) console.log('arena: pulada —', arena.pulado || 'sem tentativas hoje');
  else {
    const dRubini = arena.depois.rubini - arena.antes.rubini;
    const dCharm = arena.depois.charm - arena.antes.charm;
    console.log(`arena: luta feita | rubini ${dRubini >= 0 ? '+' : ''}${dRubini} | charm ${dCharm >= 0 ? '+' : ''}${dCharm}`);
    if (dRubini !== 0) falhas.push(`arena pagou ${dRubini} Rubini Coin — o modo não pode dar moeda premium`);
    if (arena.depois.gold !== arena.antes.gold) falhas.push('arena mexeu no gold do jogador');
    ok.push('arena (luta)');
  }

  // ---------- ARENA: recompensa de divisão ----------
  const divisao = await page.evaluate(async () => {
    const au = await window.__liveImport('arenaUseCases.js');
    const pr = await window.__liveImport('progression.js');
    const div = pr.ARENA_DIVISIONS.find(d => !(window.__G.arenaDivisionsClaimed || []).includes(d));
    if (!div) return { pulado: 'todas as divisões já resgatadas' };
    const premio = pr.ARENA_DIVISION_REWARDS[div];
    const antes = { charm: window.__G.charmPoints || 0, prey: window.__G.preyCards || 0,
                    boosts: { ...(window.__G.boosts || {}) }, gold: window.__G.gold, rubini: window.__G.rubini,
                    itens: Object.keys(window.__G.inventory).length };
    au.claimArenaDivisionReward(div);
    await new Promise(x => setTimeout(x, 1000));
    return { div, tipo: premio && premio.type, antes,
             depois: { charm: window.__G.charmPoints || 0, prey: window.__G.preyCards || 0,
                       boosts: { ...(window.__G.boosts || {}) }, gold: window.__G.gold, rubini: window.__G.rubini,
                       itens: Object.keys(window.__G.inventory).length },
             resgatou: (window.__G.arenaDivisionsClaimed || []).includes(div) };
  });
  if (divisao.pulado) console.log('divisão: pulada —', divisao.pulado);
  else {
    const a = divisao.antes, d = divisao.depois;
    const mexeu = [];
    if (d.charm !== a.charm) mexeu.push(`charm +${d.charm - a.charm}`);
    if (d.prey !== a.prey) mexeu.push(`carta de presa +${d.prey - a.prey}`);
    Object.keys(d.boosts).forEach(k => { if ((d.boosts[k] || 0) > (a.boosts[k] || 0)) mexeu.push(`boost ${k}`); });
    console.log(`divisão ${divisao.div} (${divisao.tipo}): resgatou=${divisao.resgatou} | ganhou: ${mexeu.join(', ') || 'NADA'}`);
    if (!divisao.resgatou) falhas.push(`divisão ${divisao.div}: não marcou como resgatada`);
    else if (!mexeu.length) falhas.push(`divisão ${divisao.div} (${divisao.tipo}): marcou como resgatada mas NENHUM prêmio chegou`);
    else ok.push('recompensa de divisão');
    if (d.gold !== a.gold) falhas.push(`divisão ${divisao.div}: deu gold (${d.gold - a.gold}) — proibido`);
    if (d.rubini !== a.rubini) falhas.push(`divisão ${divisao.div}: deu Rubini (${d.rubini - a.rubini}) — proibido`);
    if (d.itens !== a.itens) falhas.push(`divisão ${divisao.div}: entregou item no inventário — proibido`);
  }

  // ---------- BATTLE PASS: resgate de tier ----------
  const bp = await page.evaluate(async () => {
    const bu = await window.__liveImport('battlePassUseCases.js');
    const pr = await window.__liveImport('progression.js');
    const alcancado = pr.BP_REWARDS.filter(r => window.__G.bpTier >= r.tier
      && !(window.__G.bpClaimed || []).includes(r.tier));
    if (!alcancado.length) return { pulado: `nenhum tier resgatável (tier atual ${window.__G.bpTier})` };
    const alvo = alcancado[0];
    const antes = { charm: window.__G.charmPoints || 0, prey: window.__G.preyCards || 0,
                    boosts: { ...(window.__G.boosts || {}) }, gold: window.__G.gold, rubini: window.__G.rubini };
    await bu.claimBpReward(alvo.tier, 'free');
    await new Promise(x => setTimeout(x, 2000));
    return { tier: alvo.tier, tipo: alvo.type, antes,
             depois: { charm: window.__G.charmPoints || 0, prey: window.__G.preyCards || 0,
                       boosts: { ...(window.__G.boosts || {}) }, gold: window.__G.gold, rubini: window.__G.rubini },
             resgatou: (window.__G.bpClaimed || []).includes(alvo.tier) };
  });
  if (bp.pulado) console.log('battle pass: pulado —', bp.pulado);
  else {
    const a = bp.antes, d = bp.depois;
    const mexeu = [];
    if (d.charm !== a.charm) mexeu.push(`charm +${d.charm - a.charm}`);
    if (d.prey !== a.prey) mexeu.push(`carta de presa +${d.prey - a.prey}`);
    Object.keys(d.boosts).forEach(k => { if ((d.boosts[k] || 0) > (a.boosts[k] || 0)) mexeu.push(`boost ${k}`); });
    console.log(`battle pass tier ${bp.tier} (${bp.tipo}): resgatou=${bp.resgatou} | ganhou: ${mexeu.join(', ') || 'NADA'}`);
    if (bp.resgatou && !mexeu.length) falhas.push(`BP tier ${bp.tier} (${bp.tipo}): marcou resgatado mas nenhum prêmio chegou`);
    if (d.gold !== a.gold) falhas.push(`BP tier ${bp.tier}: deu gold — proibido`);
    if (d.rubini !== a.rubini) falhas.push(`BP tier ${bp.tier}: deu Rubini — proibido`);
    if (bp.resgatou) ok.push('battle pass');
  }

  // ---------- BOSS ZONE ----------
  const boss = await page.evaluate(async () => {
    const hu = await window.__liveImport('huntUseCases.js');
    if (typeof hu.setBossOnlyMode !== 'function') return { erro: 'setBossOnlyMode não existe' };
    const be = await window.__liveImport('bestiary.js');
    const zonaComBoss = Object.entries(be.ZONES).find(([, z]) => z.boss);
    if (!zonaComBoss) return { erro: 'nenhuma zona com boss' };
    hu.selectZone(zonaComBoss[0]);
    await new Promise(x => setTimeout(x, 700));
    hu.setBossOnlyMode(true);
    await new Promise(x => setTimeout(x, 500));
    const ligado = typeof hu.isBossOnlyHunt === 'function' ? hu.isBossOnlyHunt() : null;
    hu.setBossOnlyMode(false);
    return { zona: zonaComBoss[0], boss: zonaComBoss[1].boss, ligou: ligado };
  });
  if (boss.erro) falhas.push('boss zone: ' + boss.erro);
  else {
    console.log(`boss zone: ${boss.zona} (boss ${boss.boss}) | modo boss ligou: ${boss.ligou}`);
    if (boss.ligou !== true) falhas.push('boss zone: setBossOnlyMode(true) não ligou o modo');
    else ok.push('boss zone');
  }

  // ---------- RECOMPENSA DIÁRIA ----------
  const diaria = await page.evaluate(async () => {
    const du = await window.__liveImport('dailyRewardUseCases.js');
    const fn = du.claimDailyReward || du.claimDaily;
    if (typeof fn !== 'function') return { erro: 'função de resgate não encontrada' };
    // claimDailyReward e ASSINCRONA e faz DUAS idas ao servidor (estado +
    // resgate). Sem await, a foto da carteira saia antes do premio chegar e o
    // teste concluia "nao mudou nada" num resgate que funcionava.
    const estado = await du.getDailyState();
    const antes = JSON.stringify(carteiraLocal());
    if (!estado.canClaim) return { pulado: `ja resgatada hoje (dia ${estado.streak})` };
    await fn();
    await new Promise(x => setTimeout(x, 1500));
    return { antes, depois: JSON.stringify(carteiraLocal()), streak: window.__G.dailyStreak, podia: estado.canClaim };
    function carteiraLocal() {
      return { gold: window.__G.gold, rubini: window.__G.rubini, charm: window.__G.charmPoints || 0,
               prey: window.__G.preyCards || 0, itens: Object.keys(window.__G.inventory).length };
    }
  });
  if (diaria.erro) falhas.push('diária: ' + diaria.erro);
  else if (diaria.pulado) console.log('diária: pulada —', diaria.pulado);
  else {
    const mudou = diaria.antes !== diaria.depois;
    console.log(`diária: streak ${diaria.streak} | estava resgatável e a carteira mudou: ${mudou}`);
    if (!mudou) falhas.push('diária: estava resgatável, resgatou e NADA mudou na carteira');
    else ok.push('recompensa diária');
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
