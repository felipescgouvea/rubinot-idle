// AUDITORIA DAS PRESAS (Prey).
//
// O sistema era DECORATIVO: o jogador travava a criatura, lia "+40% XP" no
// card e recebia zero — o servidor, que resolve a caçada inteira, nunca ficava
// sabendo que existia uma presa. Nenhum teste passava por aqui, então ninguém
// via. Este arquivo existe pra isso não voltar a acontecer.
//
// Três perguntas:
//   1. as regras batem com o Tibia (raridade 1..10, reroll sempre sobe, as
//      quatro fórmulas de porcentagem)?
//   2. a presa CHEGA ao servidor quando a caçada começa?
//   3. o bônus de XP aparece no XP realmente creditado por uma morte?
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

  // ---------- 1. as REGRAS ----------
  const regras = await page.evaluate(async () => {
    const pr = await window.__liveImport('prey.js');
    // fórmulas do Crystal Server: dano 2r+5, defesa 2r+10, xp/loot 3r+10
    const esperado = { damage: r => 2 * r + 5, defense: r => 2 * r + 10, xp: r => 3 * r + 10, loot: r => 3 * r + 10 };
    const erradas = [];
    for (const tipo of Object.keys(esperado)) {
      for (const r of [1, 3, 7, 10]) {
        const got = Math.round(pr.preyBonusPct(tipo, r) * 100);
        if (got !== esperado[tipo](r)) erradas.push(`${tipo} ${r}★: ${got}% (esperado ${esperado[tipo](r)}%)`);
      }
    }
    // o reroll NUNCA pode baixar a raridade
    let caiu = null, r = 0;
    for (let i = 0; i < 200; i++) {
      const novo = pr.rollPreyRarity(r);
      if (novo < r) { caiu = `${r} -> ${novo}`; break; }
      if (novo > pr.PREY_MAX_RARITY || novo < 1) { caiu = `fora da faixa: ${novo}`; break; }
      r = novo >= pr.PREY_MAX_RARITY ? 0 : novo;   // reinicia pra amostrar de novo
    }
    // na raridade máxima o TIPO tem que mudar
    const tiposNoMax = new Set();
    for (let i = 0; i < 50; i++) tiposNoMax.add(pr.rollPreyBonusType('xp', pr.PREY_MAX_RARITY));
    return { erradas, caiu, maxRarity: pr.PREY_MAX_RARITY,
             tipos: Object.keys(pr.PREY_BONUS_TYPES),
             repetiuNoMax: tiposNoMax.has('xp') };
  });
  console.log(`regras: raridade máx ${regras.maxRarity} · tipos [${regras.tipos.join(', ')}]`);
  if (regras.erradas.length) falhas.push(`fórmula de bônus fora do Tibia: ${regras.erradas.join(' | ')}`);
  else ok.push('fórmulas de bônus');
  if (regras.caiu) falhas.push(`o reroll BAIXOU a raridade (${regras.caiu}) — no Tibia rerolar sempre sobe`);
  else ok.push('reroll nunca piora');
  if (regras.maxRarity !== 10) falhas.push(`raridade máxima ${regras.maxRarity}, no Tibia é 10`);
  if (!regras.tipos.includes('defense')) falhas.push('falta o bônus de DEFESA (o Tibia tem 4 tipos)');
  else ok.push('quatro tipos de bônus');
  if (regras.repetiuNoMax) falhas.push('na raridade máxima o tipo do bônus repetiu — o Tibia obriga a trocar');
  else ok.push('troca de tipo na raridade máxima');

  // ---------- 2. a presa CHEGA ao servidor? ----------
  // Trava uma presa de XP na criatura da zona, com a raridade no teto, e
  // confere que o snapshot enviado ao servidor leva o prey junto.
  const envio = await page.evaluate(async z => {
    const be = await window.__liveImport('bestiary.js');
    const pu = await window.__liveImport('preyUseCases.js');
    const hu = await window.__liveImport('huntUseCases.js');
    const zona = be.ZONES[z];
    // ZONE_SPAWN e um OBJETO { monstro: peso }, nao lista de pares. Pega o de
    // MAIOR peso: a presa so vale contra aquela criatura, entao mirar a mais
    // comum da zona e o que deixa o efeito mensuravel.
    const spawn = be.ZONE_SPAWN[z] || {};
    const pares = Object.entries(spawn).sort((a, b) => b[1] - a[1]);
    const alvo = (pares[0] && pares[0][0]) || (zona.monsters || [])[0];
    const pesoAlvo = pares.length ? pares[0][1] / pares.reduce((t, e) => t + e[1], 0) : 1;
    if (!alvo) return { erro: 'zona sem monstro' };
    pu.activatePrey(0, alvo);
    await new Promise(r => setTimeout(r, 600));
    // força XP no teto pra o efeito ser mensurável (o sorteio é aleatório)
    const p = window.__G.prey[0];
    p.bonusType = 'xp'; p.rarity = 10;
    const pr = await window.__liveImport('prey.js');
    p.bonusPct = pr.preyBonusPct('xp', 10);
    // espia o corpo mandado no /hunt/start
    const origFetch = window.fetch;
    let corpo = null;
    window.fetch = function (u, o) {
      if (String(u).includes('/hunt/start') && o && o.body) { try { corpo = JSON.parse(o.body); } catch {} }
      return origFetch.apply(this, arguments);
    };
    hu.selectZone(z);
    await new Promise(r => setTimeout(r, 700));
    await hu.startHunt();
    await new Promise(r => setTimeout(r, 1500));
    window.fetch = origFetch;
    return { alvo, pesoAlvo, bonusPct: p.bonusPct, mandouPrey: !!(corpo && Array.isArray(corpo.prey)),
             preyNoCorpo: corpo && corpo.prey ? corpo.prey.filter(Boolean).length : 0 };
  }, ZONA);
  if (envio.erro) throw new Error(envio.erro);
  console.log(`presa: ${envio.alvo} (${Math.round(envio.pesoAlvo * 100)}% dos spawns da zona) · XP +${Math.round(envio.bonusPct * 100)}% (10★) · snapshot levou prey: ${envio.mandouPrey} (${envio.preyNoCorpo} slot(s))`);
  if (!envio.mandouPrey) falhas.push('o /hunt/start NÃO manda o prey — o bônus não pode existir, a caçada é resolvida no servidor');
  else if (!envio.preyNoCorpo) falhas.push('o snapshot mandou a lista de prey VAZIA mesmo com presa travada');
  else ok.push('prey chega ao servidor');

  // ---------- 3. o bônus aparece no XP creditado? ----------
  // Compara o XP creditado por morte da criatura COM presa contra o XP base
  // do bestiário. Não dá pra isolar 100% (zona/mundo/stamina também
  // multiplicam), então o teste checa a RAZÃO entre com e sem presa.
  const medir = async () => page.evaluate(async alvo => {
    const antes = window.__G.xp;
    const t0 = Date.now();
    let mortes = 0;
    const be = await window.__liveImport('bestiary.js');
    while (Date.now() - t0 < 60000) {
      await new Promise(r => setTimeout(r, 500));
      const k = window.__G.totalKills;
      if (k != null) mortes = k;
    }
    return { ganho: window.__G.xp - antes, mortes, xpBase: be.MONSTERS[alvo].xp };
  }, envio.alvo);

  const comPresa = await medir();
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  const semPresa = await page.evaluate(async z => {
    const pu = await window.__liveImport('preyUseCases.js');
    const hu = await window.__liveImport('huntUseCases.js');
    pu.clearPrey(0);
    await new Promise(r => setTimeout(r, 600));
    hu.selectZone(z);
    await new Promise(r => setTimeout(r, 700));
    await hu.startHunt();
    const antes = window.__G.xp;
    await new Promise(r => setTimeout(r, 60000));
    return { ganho: window.__G.xp - antes };
  }, ZONA);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  console.log(`XP em 60s — com presa (+40%): ${comPresa.ganho} · sem presa: ${semPresa.ganho}`);
  if (!comPresa.ganho || !semPresa.ganho) {
    console.log('efeito do bônus: INCONCLUSIVO — não ganhou XP em uma das medições');
  } else {
    const razao = comPresa.ganho / semPresa.ganho;
    // A presa so vale contra UMA criatura; se ela e 88% dos spawns, o ganho
    // medido e diluido pelos outros 12%. Por isso o esperado sai do peso real.
    const esperadaRazao = 1 + envio.bonusPct * envio.pesoAlvo;
    console.log(`   razão ${razao.toFixed(2)}x (esperado ~${esperadaRazao.toFixed(2)}x, já diluído pelo peso do spawn; a contagem de mortes varia, então a faixa é larga)`);
    // Faixa larga de propósito: o número de mortes em 60s é aleatório. O que
    // NÃO pode acontecer é a razão ficar em torno de 1.0 — isso significa que
    // o bônus não fez diferença nenhuma, que era o bug.
    if (razao < 1.12) falhas.push(`o bônus de XP da presa não teve efeito: ${razao.toFixed(2)}x com +40% configurado`);
    else ok.push('bônus de XP da presa chega no XP creditado');
  }
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
