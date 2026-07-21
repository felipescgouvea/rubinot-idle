// AUDITORIA DE FLUXOS: exercita as ações que o jogador realmente faz e confere
// o EFEITO delas no estado, não só que a tela abriu.
//
// A varredura estática (audit-app.mjs) só olha as telas. Aqui: comprar, vender,
// equipar, trocar de mundo. Cada passo compara antes/depois — um botão que abre
// e não faz nada passaria despercebido de outro jeito.
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

const estado = () => page.evaluate(() => ({
  gold: window.__G.gold,
  mundo: window.__G.currentWorld,
  inv: { ...window.__G.inventory },
  eq: { ...window.__G.equipment },
}));

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1200);

  // dinheiro suficiente pra exercitar a compra (o servidor e quem manda no gold;
  // se nao houver, o teste reporta inconclusivo em vez de falhar)
  const g0 = (await estado()).gold;
  console.log('gold inicial:', g0);

  // ---------- COMPRAR ----------
  const compra = await page.evaluate(async () => {
    const sc = await window.__liveImport('shopCatalog.js');
    const su = await window.__liveImport('shopUseCases.js');
    const barato = sc.SHOP_ITEMS
      .filter(s => s.currency === 'gold' && s.type !== 'boost' && s.price > 0)
      .sort((a, b) => a.price - b.price)[0];
    if (!barato) return { erro: 'nenhum item de gold no catalogo' };
    if (window.__G.gold < barato.price) return { pulado: `gold insuficiente (${window.__G.gold} < ${barato.price})` };
    const antesGold = window.__G.gold;
    const alvo = barato.itemId || barato.id;
    const antesQtd = window.__G.inventory[alvo] || 0;
    await su.buyShopItem(barato.id, 1);
    await new Promise(r => setTimeout(r, 2500));
    return { item: barato.id, alvo, preco: barato.price, antesGold, depoisGold: window.__G.gold,
             antesQtd, depoisQtd: window.__G.inventory[alvo] || 0 };
  });
  if (compra.erro) falhas.push('compra: ' + compra.erro);
  else if (compra.pulado) console.log('compra: pulada —', compra.pulado);
  else {
    const pagou = compra.antesGold - compra.depoisGold;
    const recebeu = compra.depoisQtd - compra.antesQtd;
    console.log(`compra: ${compra.item} por ${compra.preco} | gold ${compra.antesGold}->${compra.depoisGold} (-${pagou}) | item ${compra.antesQtd}->${compra.depoisQtd}`);
    if (recebeu < 1) falhas.push(`compra de ${compra.item}: gold saiu mas o item NAO entrou no inventario`);
    else if (pagou <= 0) falhas.push(`compra de ${compra.item}: item entrou mas o gold NAO foi cobrado`);
    else ok.push('comprar');
  }

  // ---------- VENDER ----------
  const venda = await page.evaluate(async () => {
    const iu = await window.__liveImport('inventoryUseCases.js');
    const it = await window.__liveImport('items.js');
    const id = Object.keys(window.__G.inventory).find(k => (window.__G.inventory[k] || 0) > 0
      && it.ITEMS[k] && (it.ITEMS[k].sell || 0) > 0
      && !Object.values(window.__G.equipment).includes(k));
    if (!id) return { pulado: 'nada vendavel no inventario' };
    const antesGold = window.__G.gold, antesQtd = window.__G.inventory[id];
    await iu.sellItem(id);
    await new Promise(r => setTimeout(r, 2500));
    return { id, valor: it.ITEMS[id].sell, antesGold, depoisGold: window.__G.gold,
             antesQtd, depoisQtd: window.__G.inventory[id] || 0 };
  });
  if (venda.pulado) console.log('venda: pulada —', venda.pulado);
  else {
    console.log(`venda: ${venda.id} (${venda.valor}) | gold ${venda.antesGold}->${venda.depoisGold} | qtd ${venda.antesQtd}->${venda.depoisQtd}`);
    if (venda.depoisQtd >= venda.antesQtd) falhas.push(`venda de ${venda.id}: item NAO saiu do inventario`);
    else if (venda.depoisGold <= venda.antesGold) falhas.push(`venda de ${venda.id}: item saiu mas o gold NAO entrou`);
    else ok.push('vender');
  }

  // ---------- EQUIPAR ----------
  const equipar = await page.evaluate(async () => {
    const iu = await window.__liveImport('inventoryUseCases.js');
    const it = await window.__liveImport('items.js');
    // Precisa ser algo AINDA NAO equipado — equipar o que ja esta no slot passa
    // sem provar nada (foi o que aconteceu com a adaga na 1a rodada).
    const equipados = new Set(Object.values(window.__G.equipment).filter(Boolean));
    // Respeita a restricao de vocacao: knight nao equipa municao, mago nao
    // equipa espada. Sem este filtro o teste mandava um knight equipar flecha,
    // o jogo recusava CERTO e eu lia isso como bug.
    const candidato = k => {
      const item = it.ITEMS[k];
      if (!item || !it.EQUIPPABLE_TYPES.includes(item.type)) return false;
      if ((window.__G.inventory[k] || 0) <= 0 || equipados.has(k)) return false;
      return !it.equipBlockReason(item, window.__G.vocation, x => x);
    };
    const id = Object.keys(window.__G.inventory).find(candidato);
    if (!id) return { pulado: 'nada equipavel pela vocacao atual (e ainda nao equipado) no inventario' };
    const slot = it.ITEMS[id].type;
    const antes = window.__G.equipment[slot];
    if (typeof iu.equipItem !== 'function') return { erro: 'equipItem nao existe' };
    iu.equipItem(id);
    await new Promise(r => setTimeout(r, 1200));
    return { id, slot, antes, depois: window.__G.equipment[slot] };
  });
  if (equipar.erro) falhas.push('equipar: ' + equipar.erro);
  else if (equipar.pulado) console.log('equipar: pulado —', equipar.pulado);
  else {
    console.log(`equipar: ${equipar.id} no slot ${equipar.slot} | ${equipar.antes} -> ${equipar.depois}`);
    if (equipar.depois !== equipar.id) falhas.push(`equipar ${equipar.id}: o slot ${equipar.slot} nao recebeu o item`);
    else ok.push('equipar');
  }

  // ---------- TROCAR DE MUNDO (aba recem-liberada) ----------
  const mundo = await page.evaluate(async () => {
    const wu = await window.__liveImport('worldUseCases.js');
    const pr = await window.__liveImport('progression.js');
    const lista = pr.WORLDS || [];
    const atual = window.__G.currentWorld;
    // O gate e reqLevel (nao minLevel): com o campo errado o teste escolhia um
    // mundo TRAVADO, selectWorld recusava certo e eu lia isso como bug.
    const outro = lista.find(w => w.id !== atual && window.__G.level >= (w.reqLevel || 1));
    if (!outro) return { pulado: `nenhum outro mundo liberado no nivel ${window.__G.level} (o proximo pede ${Math.min(...lista.filter(w => w.id !== atual).map(w => w.reqLevel || 1))})` };
    wu.selectWorld(outro.id);
    await new Promise(r => setTimeout(r, 1200));
    const novo = window.__G.currentWorld;
    if (novo === outro.id) { wu.selectWorld(atual); await new Promise(r => setTimeout(r, 800)); }
    return { de: atual, para: outro.id, virou: novo, restaurado: window.__G.currentWorld };
  });
  if (mundo.pulado) console.log('mundo: pulado —', mundo.pulado);
  else {
    console.log(`mundo: ${mundo.de} -> ${mundo.para} (virou ${mundo.virou}, restaurado para ${mundo.restaurado})`);
    if (mundo.virou !== mundo.para) falhas.push(`trocar de mundo: clicou em ${mundo.para} e continuou em ${mundo.virou}`);
    else ok.push('trocar de mundo');
  }
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 200));
} finally {
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nfluxos verificados: ${ok.join(', ') || 'nenhum'}`);
  // Passar sem ter exercitado NADA não é aprovação — é teste que não rodou.
  // Sem esta distinção, uma conta sem gold e sem itens dava "PASSOU" com todos
  // os fluxos pulados.
  if (!falhas.length && !ok.length) {
    console.log('\nRESULTADO: INCONCLUSIVO — todos os fluxos foram pulados, nada foi verificado');
  } else {
    console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  }
  await browser.close();
}
