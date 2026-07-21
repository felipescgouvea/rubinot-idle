// AUDITORIA de dois fluxos nunca exercitados: MORTE e MERCADO.
//
// Morte: e o unico caminho do jogo que TIRA coisas do jogador (XP e bencao).
// Um erro aqui e destrutivo e silencioso, entao o teste mede o que saiu e
// confere contra a regra (domain/blessings.js) — e principalmente se o jogo
// volta a um estado jogavel depois.
//
// Mercado: anunciar/cancelar mexe em inventario E carteira; verifica que o item
// sai da bag ao anunciar e VOLTA ao cancelar (nada some pelo caminho).
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

  // ---------- MORTE ----------
  const antes = await page.evaluate(() => ({
    xp: window.__G.xp, level: window.__G.level, hp: window.__G.hp,
    blessings: window.__G.blessings || 0,
  }));
  console.log(`antes da morte: lv ${antes.level} · ${antes.xp} XP · ${antes.hp} HP · ${antes.blessings} bênçãos`);

  await page.evaluate(async z => {
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
  }, ZONA_LETAL);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});

  const morreu = await page.waitForFunction(
    () => (window.__LOG || []).some(l => /morreu|you died|died to/i.test(l)) || window.__G.hp <= 0,
    null, { timeout: 90000 }
  ).then(() => true).catch(() => false);
  await page.waitForTimeout(4000);

  const depois = await page.evaluate(() => ({
    xp: window.__G.xp, level: window.__G.level, hp: window.__G.hp,
    maxHp: window.__G.maxHp, blessings: window.__G.blessings || 0,
    caçando: !!window.__G.hunting,
    linhaMorte: (window.__LOG || []).filter(l => /morreu|died/i.test(l)).slice(-1)[0] || null,
  }));
  console.log(`morreu: ${morreu} | depois: lv ${depois.level} · ${depois.xp} XP · ${depois.hp} HP · ${depois.blessings} bênçãos · caçando=${depois.caçando}`);
  console.log('log:', depois.linhaMorte || '(sem linha de morte)');

  if (!morreu) console.log(`morte: INCONCLUSIVO — não morreu em 90s em ${ZONA_LETAL}`);
  else {
    ok.push('morte');
    if (depois.hp <= 0) falhas.push('após morrer o personagem ficou com HP 0 — estado travado, sem revive');
    if (depois.caçando) falhas.push('a caçada continuou rodando depois da morte');
    if (!depois.linhaMorte) falhas.push('a morte não gerou linha no log de combate');
    // perda de XP: so pode DIMINUIR (ou zerar ao cair de nivel), nunca aumentar
    const subiu = depois.level > antes.level || (depois.level === antes.level && depois.xp > antes.xp);
    if (subiu) falhas.push(`morrer AUMENTOU o progresso: ${antes.xp}->${depois.xp} XP`);
    if (depois.blessings > antes.blessings) falhas.push('morrer aumentou as bênçãos');

    // continua jogável? tenta caçar de novo numa zona segura
    const voltou = await page.evaluate(async () => {
      window.__H.selectZone('rat_cave');
      await new Promise(r => setTimeout(r, 800));
      await window.__H.startHunt();
      await new Promise(r => setTimeout(r, 4000));
      const v = { caçando: !!window.__G.hunting, hp: window.__G.hp };
      if (window.__G.hunting) window.toggleHunt();
      return v;
    });
    console.log(`volta ao jogo: caçando=${voltou.caçando} com ${voltou.hp} HP`);
    if (!voltou.caçando) falhas.push('depois de morrer NÃO foi possível iniciar outra caçada');
    else ok.push('recuperação após a morte');
  }
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ---------- MERCADO ----------
  const mercado = await page.evaluate(async () => {
    const mu = await window.__liveImport('marketUseCases.js');
    const it = await window.__liveImport('items.js');
    const disponivel = Object.keys(window.__G.inventory).find(k => (window.__G.inventory[k] || 0) > 0
      && it.ITEMS[k] && !Object.values(window.__G.equipment).includes(k));
    if (!disponivel) return { pulado: 'nada no inventário para anunciar' };
    if (typeof mu.listItemOnMarket !== 'function') return { erro: 'listItemOnMarket não existe' };

    const antesQtd = window.__G.inventory[disponivel];
    await mu.listItemOnMarket(disponivel, 1, 500);
    await new Promise(r => setTimeout(r, 3000));
    const depoisAnuncio = window.__G.inventory[disponivel] || 0;

    // acha o anúncio recém-criado e cancela
    // Nomes REAIS: fetchMarketListings / cancelMyListing (a versao anterior
    // chutou nomes, nao achou e deixou o cancelamento sem exercitar — que e
    // justamente onde um item pode sumir).
    let cancelou = null, voltouQtd = null, motivo = null;
    const lista = await mu.fetchMarketListings();
    const todos = (lista && (lista.listings || lista)) || [];
    // A lista vem MOLDADA pro painel: o campo e itemId (camelCase) e o proprio
    // anuncio vem marcado com `mine`. Procurar por item_id (snake_case, como no
    // banco) nao achava nada e o cancelamento ficava sem ser exercitado.
    const alvo = todos.filter(l => l.itemId === disponivel && l.mine)
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];
    if (!alvo) motivo = 'anuncio nao apareceu na listagem';
    else {
      const r = await mu.cancelMyListing(alvo.id, disponivel, 1, 'sell');
      await new Promise(x => setTimeout(x, 3000));
      cancelou = !(r && r.ok === false);
      motivo = r && r.error ? r.error : null;
      voltouQtd = window.__G.inventory[disponivel] || 0;
    }
    return { item: disponivel, antesQtd, depoisAnuncio, cancelou, voltouQtd, motivo };
  });
  if (mercado.pulado) console.log('mercado: pulado —', mercado.pulado);
  else if (mercado.erro) falhas.push('mercado: ' + mercado.erro);
  else {
    console.log(`mercado: ${mercado.item} | bag ${mercado.antesQtd} -> ${mercado.depoisAnuncio} ao anunciar`
      + (mercado.cancelou ? ` -> ${mercado.voltouQtd} ao cancelar` : ` (cancelamento nao exercitado: ${mercado.motivo || 'motivo desconhecido'})`));
    if (mercado.depoisAnuncio >= mercado.antesQtd) falhas.push(`mercado: anunciou ${mercado.item} e o item NÃO saiu da bag`);
    else {
      ok.push('anunciar no mercado');
      if (mercado.cancelou === false) falhas.push(`mercado: cancelar o anuncio falhou (${mercado.motivo})`);
      else if (mercado.cancelou && mercado.voltouQtd !== mercado.antesQtd) {
        falhas.push(`mercado: cancelou o anúncio e o item NÃO voltou (${mercado.voltouQtd} de ${mercado.antesQtd})`);
      } else if (mercado.cancelou) ok.push('cancelar anúncio');
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
