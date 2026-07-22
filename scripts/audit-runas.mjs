// AUDITORIA DAS RUNAS DE ATAQUE (RTC).
//
// Duas queixas do Felipe: "runas não estão sendo lançadas" e "área da runa
// está incorreta". O teste configura uma runa na 1a caixinha de prioridade,
// caça, e mede TRÊS coisas de verdade:
//   1. a runa aparece no log de combate (foi lançada mesmo)
//   2. a quantidade no inventário DIMINUI (o servidor consumiu a carga)
//   3. quando a runa é de área, mais de uma criatura da sala leva dano
//
// Nada aqui confia em "o botão respondeu": runa lançada tem que consumir carga
// e sair no log, senão o jogador gasta configuração e não recebe ataque nenhum.
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
  await page.evaluate(async () => {
    const bus = await window.__liveImport('eventBus.js');
    window.__LOG = [];
    bus.on(bus.EVENTS.LOG, m => window.__LOG.push((typeof m === 'string' ? m : (m && m.html) || '').replace(/<[^>]*>/g, '')));
  });
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ---------- que runas esta vocação/ML consegue usar? ----------
  const cenario = await page.evaluate(async () => {
    const rc = await window.__liveImport('rtcConfig.js');
    const it = await window.__liveImport('items.js');
    const st = await window.__liveImport('stats.js');
    const ml = st.getMagic();
    const usaveis = Object.entries(it.ITEMS)
      .filter(([id, i]) => i.type === 'rune' && i.dmg && rc.canUseAttackRune(id, window.__G.vocation, ml))
      .map(([id, i]) => ({ id, nome: i.name, area: i.area || 'single', reqMl: i.reqMl || 0, tem: window.__G.inventory[id] || 0 }));
    return { voc: window.__G.vocation, nivel: window.__G.level, ml, usaveis };
  });
  console.log(`${cenario.voc} lv ${cenario.nivel} · ML ${cenario.ml}`);
  console.log(`runas usáveis: ${cenario.usaveis.length ? cenario.usaveis.map(r => `${r.id}(area=${r.area}, ML${r.reqMl}, tem ${r.tem})`).join(', ') : 'NENHUMA'}`);
  if (!cenario.usaveis.length) {
    // Knight não usa runa de ataque POR REGRA (dano de runa escala com Magic
    // Level, ver domain/rtcConfig.js) — nesse caso não há o que exercitar, e
    // isso é comportamento certo, não falha.
    console.log(`RESULTADO: INCONCLUSIVO — ${cenario.voc} não usa runa de ataque por regra do jogo, nada a exercitar`);
    await browser.close();
    process.exit(0);
  }

  // ---------- garante carga: compra na loja se precisar ----------
  const compra = await page.evaluate(async ids => {
    const sc = await window.__liveImport('shopCatalog.js');
    const su = await window.__liveImport('shopUseCases.js');
    const oferta = sc.SHOP_ITEMS.find(s => s.currency === 'gold' && ids.includes(s.itemId));
    if (!oferta) return { pulado: 'nenhuma runa usável está à venda' };
    if (window.__G.gold < oferta.price * 20) return { pulado: `gold insuficiente (${window.__G.gold})` };
    const antes = window.__G.inventory[oferta.itemId] || 0;
    await su.buyShopItem(oferta.id, 20);
    await new Promise(r => setTimeout(r, 3000));
    return { item: oferta.itemId, antes, depois: window.__G.inventory[oferta.itemId] || 0 };
  }, cenario.usaveis.map(r => r.id));
  if (compra.pulado) console.log('compra de runa: pulada —', compra.pulado);
  else console.log(`comprou 20x ${compra.item}: ${compra.antes} -> ${compra.depois}`);

  // ---------- escolhe a runa a testar: a que tiver carga ----------
  // Prefere uma runa DE ÁREA: só ela exercita as duas queixas de uma vez
  // (lançamento + forma da área). Sem carga de área, cai em qualquer uma.
  const alvo = await page.evaluate(async ids => {
    const it = await window.__liveImport('items.js');
    const comCarga = ids.filter(x => (window.__G.inventory[x] || 0) > 0);
    const id = comCarga.find(x => (it.ITEMS[x].area || 'single') !== 'single') || comCarga[0];
    if (!id) return null;
    return { id, nome: it.ITEMS[id].name, area: it.ITEMS[id].area || 'single', qtd: window.__G.inventory[id] };
  }, cenario.usaveis.map(r => r.id));
  if (!alvo) throw new Error('nenhuma runa usável com carga no inventário — sem como exercitar o lançamento');
  console.log(`testando: ${alvo.nome} (${alvo.id}) · área "${alvo.area}" · ${alvo.qtd} cargas`);

  // ---------- configura a runa como 1a prioridade e limpa o resto ----------
  const cfg = await page.evaluate(async id => {
    const ru = await window.__liveImport('rtcUseCases.js');
    const rc = await window.__liveImport('rtcConfig.js');
    for (let i = rc.ATTACK_SLOT_COUNT - 1; i >= 1; i--) ru.clearRtcAttackSpellSlot(i);
    ru.setRtcAttackSpellSlot(0, id, 'rune');
    await new Promise(r => setTimeout(r, 1200));
    return { slots: (window.__G.rtc.attackSpells || []).slice(), normalizado: rc.normalizeAttackSpells(window.__G.rtc) };
  }, alvo.id);
  console.log('RTC configurado:', JSON.stringify(cfg.slots), '-> prioridade', JSON.stringify(cfg.normalizado));
  if (cfg.normalizado[0] !== `rune:${alvo.id}`) {
    falhas.push(`a runa não ficou na 1a prioridade do RTC (ficou ${JSON.stringify(cfg.normalizado)})`);
  } else ok.push('configurar runa no RTC');

  // ---------- caça e observa ----------
  const qtdAntes = await page.evaluate(id => window.__G.inventory[id] || 0, alvo.id);
  await page.evaluate(async z => {
    window.__H.selectZone(z);
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
  }, ZONA);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});

  // amostra a sala pra medir respingo de área: quantas criaturas perdem HP no
  // MESMO instante (área) vs sempre só uma (alvo único)
  const amostras = await page.evaluate(async () => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 70000) {
      const pack = (window.__H.getCurrentPack() || []).map(m => ({ uid: m.uid, hp: m.hp, nome: m.name }));
      out.push(pack);
      await new Promise(r => setTimeout(r, 350));
    }
    return out;
  });
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(2000);

  const qtdDepois = await page.evaluate(id => window.__G.inventory[id] || 0, alvo.id);
  const log = await page.evaluate(() => window.__LOG || []);
  const linhas = log.filter(l => l.includes(alvo.nome));
  console.log(`\ncargas: ${qtdAntes} -> ${qtdDepois} (gastou ${qtdAntes - qtdDepois})`);
  console.log(`linhas de log com "${alvo.nome}": ${linhas.length}`);
  if (linhas.length) console.log('   ex.:', linhas.slice(0, 2).join(' // '));

  if (qtdDepois >= qtdAntes && !linhas.length) {
    falhas.push(`a runa ${alvo.nome} NUNCA foi lançada: nenhuma carga consumida e nenhuma linha no log em 70s de caçada`);
  } else if (!linhas.length) {
    falhas.push(`a runa ${alvo.nome} consumiu ${qtdAntes - qtdDepois} carga(s) mas NÃO apareceu no log de combate`);
  } else if (qtdDepois >= qtdAntes) {
    falhas.push(`a runa ${alvo.nome} apareceu no log mas NENHUMA carga foi consumida (runa infinita)`);
  } else ok.push('lançamento da runa');

  // ---------- área: quantos alvos levam dano no mesmo instante ----------
  let maiorRespingo = 0, salasComVarios = 0;
  for (let i = 1; i < amostras.length; i++) {
    const antes = new Map(amostras[i - 1].map(m => [m.uid, m.hp]));
    const feridos = amostras[i].filter(m => antes.has(m.uid) && m.hp < antes.get(m.uid)).length;
    if (amostras[i - 1].length > 1) salasComVarios++;
    if (feridos > maiorRespingo) maiorRespingo = feridos;
  }
  const esperado = await page.evaluate(async a => {
    const aa = await window.__liveImport('attackAreas.js');
    return { max: aa.areaMaxTargets(a), area: aa.isAreaAttack(a) };
  }, alvo.area);
  console.log(`área: "${alvo.area}" (máx ${esperado.max} alvos) · maior respingo observado: ${maiorRespingo} criatura(s) · amostras com sala >1: ${salasComVarios}`);

  if (!salasComVarios) console.log('área: INCONCLUSIVO — a sala nunca teve mais de uma criatura viva');
  else if (esperado.area && maiorRespingo < 2) {
    falhas.push(`${alvo.nome} é de área ("${alvo.area}", até ${esperado.max} alvos) mas SÓ acertou 1 criatura em toda a caçada`);
  } else if (!esperado.area && maiorRespingo > 1) {
    falhas.push(`${alvo.nome} é de alvo único mas acertou ${maiorRespingo} criaturas de uma vez`);
  } else ok.push(`área "${alvo.area}"`);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 250));
} finally {
  if (erros.size) falhas.push('erros de página: ' + [...erros].join(' | '));
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
