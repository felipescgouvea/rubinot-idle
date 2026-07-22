// AUDITORIA das BÊNÇÃOS — o único teste que mede uma REGRA NUMÉRICA de ponta a
// ponta, comparando o que o jogo faz com o que domain/blessings.js promete:
//
//   perda de XP na morte = 5% × (1 − 0,16 × bênçãos)   → 5 bênçãos ≈ 1%
//   bênçãos são CONSUMIDAS ao morrer (precisa recomprar)
//
// Por que importa: é a única compra do jogo cujo efeito só aparece num evento
// destrutivo. Se o desconto não valer, o jogador paga e não recebe — e nunca
// saberia, porque não há tela que mostre o desconto acontecendo.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA_LETAL = process.argv[2] || 'kazordoon_dragon_lair';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const erros = new Set();
page.on('pageerror', e => erros.add('PAGEERR ' + e.message.slice(0, 150)));
const falhas = [];
const ok = [];

const morrer = async () => {
  await page.evaluate(async z => {
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
  }, ZONA_LETAL);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
  const morreu = await page.waitForFunction(
    () => (window.__LOG || []).some(l => /died to|morreu para/i.test(l)),
    null, { timeout: 90000 }
  ).then(() => true).catch(() => false);
  await page.waitForTimeout(3500);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);
  return morreu;
};

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
  await page.waitForTimeout(1200);

  const info = await page.evaluate(async () => {
    const bl = await window.__liveImport('blessings.js');
    return { nivel: window.__G.level, gold: window.__G.gold, bencaos: window.__G.blessings || 0,
             custo: bl.blessingCost(window.__G.level), max: bl.MAX_BLESSINGS,
             perdaSem: bl.deathXpLossPct(0) };
  });
  console.log(`nível ${info.nivel} · ${info.gold} gold · ${info.bencaos} bênçãos · custo unitário ${info.custo}`);

  // ---------- COMPRAR ----------
  const compra = await page.evaluate(async () => {
    const bu = await window.__liveImport('blessingUseCases.js');
    const bl = await window.__liveImport('blessings.js');
    const custo = bl.blessingCost(window.__G.level);
    const quantas = Math.min(bl.MAX_BLESSINGS - (window.__G.blessings || 0), Math.floor(window.__G.gold / custo));
    if (quantas < 1) return { pulado: `gold insuficiente (${window.__G.gold} para ${custo})` };
    const antes = { gold: window.__G.gold, bencaos: window.__G.blessings || 0 };
    for (let i = 0; i < quantas; i++) { await bu.buyBlessing(); await new Promise(r => setTimeout(r, 1800)); }
    return { quantas, custo, antes, depois: { gold: window.__G.gold, bencaos: window.__G.blessings || 0 } };
  });
  if (compra.pulado) { console.log('compra de bênção: pulada —', compra.pulado); }
  else {
    const ganhou = compra.depois.bencaos - compra.antes.bencaos;
    const pagou = compra.antes.gold - compra.depois.gold;
    console.log(`comprou ${ganhou} bênção(s) por ${pagou} gold (esperado ${compra.quantas} por ${compra.quantas * compra.custo})`);
    if (ganhou !== compra.quantas) falhas.push(`comprou ${compra.quantas} bênçãos e o contador subiu ${ganhou}`);
    else if (pagou !== compra.quantas * compra.custo) falhas.push(`cobrança errada: pagou ${pagou}, deveria ser ${compra.quantas * compra.custo}`);
    else ok.push('comprar bênção');
  }

  // ---------- MORRER COM BÊNÇÃO E MEDIR ----------
  const antes = await page.evaluate(() => ({ xp: window.__G.xp, level: window.__G.level, bencaos: window.__G.blessings || 0 }));
  if (!antes.bencaos) console.log('medição: pulada — sem bênçãos ativas para comparar');
  else {
    console.log(`morrendo com ${antes.bencaos} bênção(s) · ${antes.xp} XP`);
    const morreu = await morrer();
    const depois = await page.evaluate(() => ({ xp: window.__G.xp, level: window.__G.level, bencaos: window.__G.blessings || 0 }));
    if (!morreu) console.log('medição: INCONCLUSIVO — não morreu em 90s');
    else if (depois.level !== antes.level) console.log('medição: INCONCLUSIVO — caiu de nível, a conta de XP muda de base');
    else {
      const perdeu = antes.xp - depois.xp;
      const esperado = await page.evaluate(async b => {
        const bl = await window.__liveImport('blessings.js');
        return { pct: bl.deathXpLossPct(b), pctSem: bl.deathXpLossPct(0) };
      }, antes.bencaos);
      const perdaEsperada = Math.floor(antes.xp * esperado.pct);
      const perdaSemBencao = Math.floor(antes.xp * esperado.pctSem);
      console.log(`perdeu ${perdeu} XP de ${antes.xp} (${(perdeu / antes.xp * 100).toFixed(2)}%)`);
      console.log(`   esperado com ${antes.bencaos} bênção(s): ~${perdaEsperada} (${(esperado.pct * 100).toFixed(2)}%) · sem bênção seria ~${perdaSemBencao}`);
      console.log(`   bênçãos depois da morte: ${depois.bencaos} (a regra manda consumir todas)`);

      // tolerancia de 1 XP: a implementacao pode arredondar diferente
      if (Math.abs(perdeu - perdaEsperada) > 1) {
        falhas.push(`perda de XP não bate com a regra: perdeu ${perdeu}, esperado ~${perdaEsperada} com ${antes.bencaos} bênção(s)`);
      } else ok.push('desconto de XP pela bênção');
      if (perdaSemBencao > perdaEsperada && perdeu >= perdaSemBencao) {
        falhas.push(`a bênção não descontou nada: perdeu ${perdeu}, o mesmo que sem bênção (${perdaSemBencao})`);
      }
      if (depois.bencaos !== 0) falhas.push(`as bênçãos NÃO foram consumidas na morte (${antes.bencaos} -> ${depois.bencaos})`);
      else ok.push('consumo das bênçãos na morte');
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
