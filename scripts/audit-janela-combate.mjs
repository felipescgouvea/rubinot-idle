// AUDITORIA DA JANELA DE COMBATE — /loop do Felipe:
// "Realize auditoria na janela de combate ate estar sem problemas" +
// "valide tanto do ponto de vista do backend/sincronia de dados quanto de UI".
//
// Não existia probe da janela em si: audit-vitals mede HP/MP, audit-rtc mede
// automação. Aqui o alvo é a JANELA inteira, em duas camadas:
//
//   UI       — abre/fecha, palco, barras, Battle List, Log e filtros, Fight
//              Mode, Densidade, layout desktop e mobile, i18n, console.
//   SINCRONIA— o que a janela MOSTRA contra o que o servidor DIZ (/hunt/state:
//              pack, stats.hp/mana, combatEvents). Esta é a parte que nenhum
//              teste de UI pega: a tela pode estar bonita e mentindo, porque o
//              servidor é o dono da verdade do combate (huntEngine).
//
// Veredito em 3 estados: PASSOU / FALHOU / INCONCLUSIVO. Inconclusivo existe
// porque um probe que não conseguiu caçar NÃO pode dizer "passou" — foi assim
// que auditorias anteriores aprovaram tela quebrada.
//
// Uso: node scripts/audit-janela-combate.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) || 'troll_cave';

// AUTO-TESTE: --mutar=<falha> injeta um defeito de propósito na janela e o
// probe TEM que acusar. Existe porque este arquivo nasceu com 4 achados que
// eram bug MEU, não do jogo (procurava <img> num sprite que é <canvas>, contava
// o ⚔️ do alvo como parte do nome, exigia tamanho de uma barra legitimamente
// em 0%). Depois de corrigir os 4, o probe passou de primeira — e um teste que
// só sabe passar não vale nada. Aqui se prova que ele ainda sabe falhar:
//   node scripts/audit-janela-combate.mjs --mutar=hp      (barra congelada)
//   node scripts/audit-janela-combate.mjs --mutar=lista   (lista fantasma)
const MUTACAO = (process.argv.find(a => a.startsWith('--mutar=')) || '').split('=')[1] || null;
const log = (...a) => console.log('[janela]', ...a);

const problemas = [];
const inconclusivos = [];
const ok = [];
const erroConsole = new Set();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.on('console', m => { if (m.type() === 'error') erroConsole.add(m.text().slice(0, 300)); });
page.on('pageerror', e => erroConsole.add('pageerror: ' + (e.message || String(e)).slice(0, 300)));

// Lê o estado do SERVIDOR pelo mesmo caminho que o jogo usa (authClient já
// carregado na página — via __liveImport pra não criar 2ª instância do módulo).
const estadoServidor = () => page.evaluate(async () => {
  const ac = await window.__liveImport('authClient.js');
  const gs = await window.__liveImport('gameStore.js');
  const r = await ac.getHuntState(gs.ACCOUNT.activeSlot);
  return {
    hunting: !!(r && r.hunting),
    pack: (r && r.pack) || [],
    hp: r && r.stats ? r.stats.hp : null,
    mana: r && r.stats ? r.stats.mana : null,
    eventos: (r && r.combatEvents) || [],
  };
});

// Lê o que a JANELA está mostrando.
const estadoUI = () => page.evaluate(() => {
  const bl = document.getElementById('battle-list');
  const itens = bl ? [...bl.children].filter(c => !c.classList.contains('battle-list-empty')) : [];
  const pct = id => { const el = document.getElementById(id); return el ? parseFloat(el.style.width) : null; };
  const num = id => { const n = (document.getElementById(id)?.textContent || '').match(/\d+/g); return n ? n.map(Number) : []; };
  return {
    // ⚔️ marca o alvo atual e ☠️ os mortos recentes (ficam 1s no fim da lista
    // de propósito, ver huntPanel: renderBattleList). Ambos são decoração da
    // UI, não fazem parte do nome — tirar antes de comparar com o servidor.
    criaturas: itens.map(c => {
      const txt = (c.innerText || '').trim();
      const hp = txt.match(/(\d+)\s*\/\s*(\d+)/);
      return {
        nome: txt.split('\n')[0].replace(/\d+\s*\/\s*\d+/, '').replace(/^[⚔️☠️\s]+/u, '').trim(),
        hp: hp ? Number(hp[1]) : null,
        maxHp: hp ? Number(hp[2]) : null,
        morta: c.classList.contains('dead'),
        temBarra: !!c.querySelector('[class*="hp"], [class*="life"], progress'),
      };
    }).filter(c => !c.morta),
    hpPct: pct('player-hp-fill'), manaPct: pct('player-mana-fill'), xpPct: pct('player-xp-fill'),
    hp: num('player-hp-label'), mana: num('player-mana-label'),
    linhasLog: document.getElementById('combat-log')?.children.length || 0,
    textoLog: (document.getElementById('combat-log')?.innerText || '').slice(-3000),
  };
});

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  log('logado');

  // ================= UI: ABRIR / FECHAR =================
  await page.evaluate(() => window.openBattleModal && window.openBattleModal());
  await page.waitForTimeout(600);
  if (!await page.isVisible('#battle-modal-box')) {
    problemas.push('ABRIR: openBattleModal() não deixou a janela visível');
  } else {
    ok.push('janela abre');
    await page.evaluate(() => window.closeBattleModal && window.closeBattleModal());
    await page.waitForTimeout(400);
    if (await page.isVisible('#battle-modal-box')) problemas.push('FECHAR: closeBattleModal() não fecha a janela');
    else ok.push('janela fecha');
    await page.evaluate(() => window.openBattleModal && window.openBattleModal());
    await page.waitForTimeout(400);
  }

  // ================= UI: ESTRUTURA =================
  // Medir TRILHA, não PREENCHIMENTO: #player-xp-fill com largura 0 é o estado
  // legítimo de quem acabou de subir de nível (0% da barra). Exigir tamanho do
  // fill acusa bug num jogo funcionando. A trilha é que nunca pode sumir.
  const ESSENCIAIS = [
    ['#dungeon-stage', 'palco da dungeon'], ['#player-sprite-wrap', 'sprite do jogador'],
    ['.player-hp-track', 'trilha de HP'], ['.player-mana-track', 'trilha de mana'],
    ['.player-xp-track', 'trilha de XP'], ['#hunt-toggle', 'botão de caçar'],
    ['#fight-mode-row', 'estilo de luta'], ['#density-row', 'densidade'],
    ['#battle-list', 'battle list'], ['#combat-log', 'log de combate'],
    ['#combat-log-tabs', 'abas do log'],
  ];
  const SO_EXISTIR = [
    ['#player-hp-fill', 'preenchimento de HP'], ['#player-mana-fill', 'preenchimento de mana'],
    ['#player-xp-fill', 'preenchimento de XP'],
  ];
  const caixas = await page.evaluate(([sels, so]) => [
    ...sels.map(([s, nome]) => {
      const el = document.querySelector(s);
      if (!el) return { s, nome, existe: false };
      const r = el.getBoundingClientRect();
      return { s, nome, existe: true, w: Math.round(r.width), h: Math.round(r.height) };
    }),
    ...so.map(([s, nome]) => ({ s, nome, existe: !!document.querySelector(s), w: 1, h: 1 })),
  ], [ESSENCIAIS, SO_EXISTIR]);
  let estruturaOk = true;
  for (const c of caixas) {
    if (!c.existe) { problemas.push(`ESTRUTURA: ${c.nome} (${c.s}) não existe no DOM`); estruturaOk = false; }
    else if (c.w === 0 || c.h === 0) { problemas.push(`ESTRUTURA: ${c.nome} (${c.s}) com tamanho zero (${c.w}x${c.h})`); estruturaOk = false; }
  }
  if (estruturaOk) ok.push(`${ESSENCIAIS.length + SO_EXISTIR.length} elementos essenciais presentes e com tamanho`);

  // ================= UI: SPRITE DO JOGADOR =================
  const sprite = await page.evaluate(() => {
    const w = document.getElementById('player-sprite-wrap');
    if (!w) return null;
    // O outfit é desenhado num <canvas> (quadros de caminhada montados em
    // characterPanel: mountPlayerWalkSprite), NÃO num <img>. Procurar por <img>
    // aqui acusa "sem sprite" num boneco que está na tela.
    const canvas = w.querySelector('canvas.player-sprite');
    const img = w.querySelector('img');
    const pintado = canvas
      ? canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0)
      : false;
    return {
      canvas: !!canvas, img: !!img, pintado,
      fallback: !!w.querySelector('.player-sprite-fallback'),
    };
  });
  if (!sprite || sprite.fallback) problemas.push('PALCO: jogador no fallback de emoji — outfit não montou');
  else if (!sprite.canvas && !sprite.img) problemas.push('PALCO: jogador sem sprite (nem canvas nem img no palco)');
  else if (sprite.canvas && !sprite.pintado) problemas.push('PALCO: canvas do jogador existe mas está TRANSPARENTE — o outfit não foi desenhado');
  else ok.push('sprite do jogador renderiza no palco');

  // ================= CAÇAR DE VERDADE =================
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // Arma o RTC com magia de ataque e poção de vida ANTES de caçar. Sem isso a
  // caçada só gera linha de "combate" e as abas magia/suprimento do log ficam
  // vazias — o probe não teria como dizer se elas filtram ou se simplesmente
  // não houve evento. Escolhe pelo que o personagem REALMENTE tem (vocação e
  // inventário), não por um id fixo que pode não existir nesta conta.
  const armado = await page.evaluate(async () => {
    const { SPELLS } = await window.__liveImport('spells.js');
    const { ITEMS } = await window.__liveImport('items.js');
    // Pelo MÓDULO, não pelo window: nem todo caso de uso do RTC é exposto
    // globalmente (setRtcHealTierSpell é chamado direto pelo painel). Chamar
    // via window aqui dava "is not a function" e parecia bug do jogo.
    const rtc = await window.__liveImport('rtcUseCases.js');
    const G = window.__G;
    const disponivel = tipo => Object.entries(SPELLS)
      .find(([, s]) => s.voc.includes(G.vocation) && s.level <= G.level && s.type === tipo);
    // Ataque quando a vocação tem no nível atual; senão CURA — as duas caem na
    // categoria "magia" do log, e um knight nível 11 não tem magia de ataque
    // (Brutal Strike é nível 16), o que deixaria a aba sem nada pra filtrar.
    const atq = disponivel('attack');
    if (atq) rtc.setRtcAttackSpellSlot(0, atq[0], 'spell');
    const cura = disponivel('heal');
    // Limiar da POÇÃO acima do da magia de cura de propósito: com a magia em
    // 99% ela cura primeiro, o HP nunca desce até a poção e a aba "suprimento"
    // fica vazia a caçada inteira. Aqui a poção age primeiro e as duas abas
    // (magia e suprimento) recebem linha.
    if (cura) { rtc.setRtcHealTierSpell(0, cura[0]); rtc.setRtcHealTierPct(0, 60); }
    // Poção pelo que o personagem REALMENTE carrega, não por uma lista de ids
    // escrita de cabeça — a conta de teste tem small_health_potion, que não
    // estava na minha lista, e o probe concluiu "sem poção" num inventário cheio.
    const pocao = Object.keys(G.inventory || {}).find(id =>
      (G.inventory[id] || 0) > 0 && ITEMS[id] && ITEMS[id].heal);
    if (pocao) { rtc.setRtcHealPotion(pocao); rtc.setRtcThreshold('healPotionThreshold', 98); }
    return { ataque: atq ? atq[0] : null, cura: cura ? cura[0] : null, pocao: pocao || null };
  });
  log('RTC armado:', JSON.stringify(armado));
  if (!armado.ataque && !armado.cura) inconclusivos.push('LOG: personagem sem magia disponível na vocação/nível — a aba "magia" não pôde ser exercitada');
  if (!armado.pocao) inconclusivos.push('LOG: personagem sem poção de vida no inventário — a aba "suprimento" não pôde ser exercitada');
  await page.waitForTimeout(800);
  const logAntes = (await estadoUI()).linhasLog;
  await page.evaluate(async z => { window.__H.selectZone(z); await new Promise(r => setTimeout(r, 700)); await window.__H.startHunt(); }, ZONA);
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 25000 }).catch(() => {});
  log(`caçando ${ZONA} por ~40s, comparando UI x servidor...`);

  if (MUTACAO) {
    log(`!! MUTAÇÃO "${MUTACAO}" injetada — o resultado esperado é FALHOU`);
    await page.evaluate(tipo => {
      setInterval(() => {
        const bl = document.getElementById('battle-list');
        if (!bl) return;
        if (tipo === 'hp') {
          // Barra congelada num valor velho: o sintoma exato de UI dessincronizada.
          for (const el of bl.querySelectorAll('.battle-list-hp-label')) el.textContent = '999/999';
        } else if (tipo === 'lista') {
          // Lista fantasma: some com as criaturas que o servidor diz estarem vivas.
          for (const el of bl.querySelectorAll('.battle-list-entry')) el.remove();
        }
      }, 120);
    }, MUTACAO);
  }

  const pares = [];         // amostras UI+servidor no mesmo instante
  let viuCriatura = false, maxCriaturas = 0;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);
    // UI primeiro, servidor logo em seguida: a janela entre as duas leituras é
    // o que define a tolerância de dessincronia aceitável mais abaixo.
    const ui = await estadoUI();
    const sv = await estadoServidor().catch(() => null);
    pares.push({ ui, sv });
    if (ui.criaturas.length) viuCriatura = true;
    maxCriaturas = Math.max(maxCriaturas, ui.criaturas.length);
  }
  const ultima = pares[pares.length - 1];

  // ================= UI: BATTLE LIST =================
  if (!viuCriatura) {
    inconclusivos.push('BATTLE LIST: nenhuma criatura apareceu em 40s de caçada — não dá pra afirmar que a lista funciona');
  } else {
    ok.push(`battle list povoou (até ${maxCriaturas} criaturas: ${pares.find(p => p.ui.criaturas.length)?.ui.criaturas.map(c => c.nome).join(', ')})`);
    if (pares.some(p => p.ui.criaturas.some(c => !c.temBarra))) problemas.push('BATTLE LIST: criatura na lista SEM barra de vida');
    if (pares.some(p => p.ui.criaturas.some(c => !c.nome))) problemas.push('BATTLE LIST: entrada com nome vazio');
    if (pares.some(p => p.ui.criaturas.some(c => c.hp != null && c.hp <= 0))) problemas.push('BATTLE LIST: criatura com HP 0 ainda listada (morta mas na tela)');
    if (pares.some(p => p.ui.criaturas.some(c => c.hp != null && c.maxHp != null && c.hp > c.maxHp))) problemas.push('BATTLE LIST: criatura com HP acima do máximo');
  }

  // ================= SINCRONIA: pack do servidor x battle list =================
  const comServidor = pares.filter(p => p.sv);
  if (!comServidor.length) {
    inconclusivos.push('SINCRONIA: nenhuma leitura de /hunt/state respondeu — não dá pra comparar UI com servidor');
  } else {
    let divContagem = 0, divNome = 0, divHp = 0, totalHp = 0, pior = null, piorHp = null;
    for (const p of comServidor) {
      if (!p.sv.hunting) continue;
      const svVivos = p.sv.pack.filter(m => m.hp > 0);
      if (svVivos.length !== p.ui.criaturas.length) {
        divContagem++;
        if (!pior) pior = `servidor ${svVivos.length} criatura(s) [${svVivos.map(m => m.name).join(', ')}] x janela ${p.ui.criaturas.length} [${p.ui.criaturas.map(c => c.nome).join(', ')}]`;
      }
      const nomesSv = svVivos.map(m => m.name).sort().join('|');
      const nomesUi = p.ui.criaturas.map(c => c.nome).sort().join('|');
      if (svVivos.length === p.ui.criaturas.length && nomesSv !== nomesUi) divNome++;
    }
    // HP por criatura: casa por nome (uid não sai na UI). A leitura da UI e a do
    // servidor NÃO são simultâneas — entre elas cabe um tick de combate inteiro
    // (2s) e um golpe pode tirar metade da vida de um troll. Comparar par a par
    // acusaria dessincronia em toda amostra. Então o critério é: o valor do
    // servidor tem que aparecer na UI em ALGUMA amostra vizinha (i-1, i, i+1).
    // Isso ainda pega o bug de verdade — barra congelada num valor velho nunca
    // alcança o servidor —, sem acusar a defasagem normal de leitura.
    const idx = pares.map((p, i) => ({ p, i })).filter(x => x.p.sv && x.p.sv.hunting);
    for (const { p, i } of idx) {
      for (const m of p.sv.pack.filter(x => x.hp > 0)) {
        totalHp++;
        const tol = Math.max(5, m.maxHp * 0.15);
        const bate = [i - 1, i, i + 1]
          .filter(j => j >= 0 && j < pares.length)
          .some(j => pares[j].ui.criaturas.some(c => c.nome === m.name && c.hp != null && Math.abs(m.hp - c.hp) <= tol));
        if (!bate) {
          divHp++;
          if (!piorHp) piorHp = `${m.name} servidor ${m.hp}/${m.maxHp}, janela ${p.ui.criaturas.filter(c => c.nome === m.name).map(c => c.hp).join('/') || '(ausente)'}`;
        }
      }
    }
    const amostrasCacando = comServidor.filter(p => p.sv.hunting).length;
    log(`sincronia: ${amostrasCacando} amostras caçando · divergência contagem=${divContagem} nome=${divNome} hp=${divHp}`);
    // Tolerância: 1 amostra divergente é a defasagem natural entre as duas
    // leituras (a UI vem do push do WebSocket, o /hunt/state é uma chamada
    // extra logo depois). Divergência SISTEMÁTICA é bug de sincronia.
    if (amostrasCacando < 3) {
      inconclusivos.push(`SINCRONIA: só ${amostrasCacando} amostra(s) com o servidor caçando — amostra pequena demais pra concluir`);
    } else {
      if (divContagem > amostrasCacando * 0.35) problemas.push(`SINCRONIA: battle list diverge do servidor em ${divContagem}/${amostrasCacando} amostras. Ex.: ${pior}`);
      else ok.push(`battle list bate com o pack do servidor (${amostrasCacando - divContagem}/${amostrasCacando} amostras)`);
      if (divNome > amostrasCacando * 0.35) problemas.push(`SINCRONIA: nomes das criaturas divergem do servidor em ${divNome}/${amostrasCacando} amostras`);
      if (totalHp && divHp > totalHp * 0.3) problemas.push(`SINCRONIA: HP das criaturas na janela não acompanha o servidor em ${divHp}/${totalHp} leituras (nem na amostra vizinha) — barra de vida com valor velho. Ex.: ${piorHp}`);
      else if (totalHp) ok.push(`HP das criaturas acompanha o servidor (${totalHp - divHp}/${totalHp} leituras)`);
    }

    // ---- SINCRONIA: HP/mana do jogador ----
    let divHpJog = 0, divMpJog = 0, exemploHp = null;
    for (const p of comServidor) {
      if (!p.sv.hunting) continue;
      if (p.sv.hp != null && p.ui.hp.length === 2) {
        const d = Math.abs(p.sv.hp - p.ui.hp[0]);
        if (d > Math.max(10, p.ui.hp[1] * 0.15)) { divHpJog++; if (!exemploHp) exemploHp = `servidor ${p.sv.hp} x janela ${p.ui.hp[0]}/${p.ui.hp[1]}`; }
      }
      if (p.sv.mana != null && p.ui.mana.length === 2) {
        const d = Math.abs(p.sv.mana - p.ui.mana[0]);
        if (d > Math.max(10, p.ui.mana[1] * 0.15)) divMpJog++;
      }
    }
    if (divHpJog > amostrasCacando * 0.4) problemas.push(`SINCRONIA: HP do jogador na janela diverge do servidor em ${divHpJog}/${amostrasCacando} amostras (ex.: ${exemploHp})`);
    else if (amostrasCacando >= 3) ok.push('HP do jogador na janela bate com o servidor');
    if (divMpJog > amostrasCacando * 0.4) problemas.push(`SINCRONIA: mana do jogador diverge do servidor em ${divMpJog}/${amostrasCacando} amostras`);
    else if (amostrasCacando >= 3) ok.push('mana do jogador na janela bate com o servidor');

    // ---- SINCRONIA: eventos de combate do servidor chegam ao log ----
    const eventosVistos = comServidor.reduce((s, p) => s + p.sv.eventos.length, 0);
    if (eventosVistos > 0 && ultima.ui.linhasLog <= logAntes) {
      problemas.push(`SINCRONIA: servidor emitiu ${eventosVistos} evento(s) de combate mas o log da janela não cresceu — eventos perdidos`);
    }
  }

  // ================= UI: LOG cresceu =================
  if (ultima.ui.linhasLog <= logAntes) inconclusivos.push(`LOG: não cresceu durante a caçada (${logAntes} → ${ultima.ui.linhasLog}) — combate não rodou`);
  else ok.push(`log de combate cresceu (${logAntes} → ${ultima.ui.linhasLog} linhas)`);

  // ================= UI: BARRAS x rótulos =================
  let barraRuim = false;
  for (const [i, { ui: a }] of pares.entries()) {
    for (const [nome, pct] of [['HP', a.hpPct], ['mana', a.manaPct], ['XP', a.xpPct]]) {
      if (pct == null || Number.isNaN(pct)) { problemas.push(`BARRA ${nome}: sem largura numérica (style.width vazio)`); barraRuim = true; break; }
      if (pct < 0 || pct > 100) { problemas.push(`BARRA ${nome}: largura fora de 0-100% (${pct}%) na amostra ${i}`); barraRuim = true; break; }
    }
    if (barraRuim) break;
    for (const [nome, val, pct] of [['HP', a.hp, a.hpPct], ['MANA', a.mana, a.manaPct]]) {
      if (val.length === 2 && pct != null && val[1]) {
        const esperado = (val[0] / val[1]) * 100;
        if (Math.abs(esperado - pct) > 6) { problemas.push(`BARRA ${nome}: largura ${pct.toFixed(0)}% não bate com o rótulo ${val[0]}/${val[1]} (=${esperado.toFixed(0)}%)`); barraRuim = true; break; }
      }
    }
    if (barraRuim) break;
  }
  if (!barraRuim) ok.push('barras HP/mana/XP coerentes com os rótulos');

  // ================= UI: ABAS DO LOG =================
  // Teste DETERMINÍSTICO do filtro: injeta uma linha de cada categoria pelo
  // mesmo barramento de eventos que o jogo usa. Depender só do que a caçada
  // produzir é frágil — se nenhum troll acertar, a aba "suprimento" fica vazia
  // e o filtro dela não é exercitado. Aqui toda aba tem pelo menos 1 linha
  // garantida, e o teste vira "o filtro esconde as outras", não "houve evento".
  const MARCA = '__probe_filtro__';
  await page.evaluate(async marca => {
    const bus = await window.__liveImport('eventBus.js');
    for (const cat of ['combate', 'magia', 'suprimento', 'loot']) {
      bus.emit(bus.EVENTS.LOG, { html: `${marca} ${cat}`, cat });
    }
  }, MARCA);
  await page.waitForTimeout(400);

  const categorias = ['tudo', 'combate', 'magia', 'suprimento', 'loot'];
  const porCat = {};
  for (const cat of categorias) {
    await page.evaluate(c => window.setLogFilter && window.setLogFilter(c), cat);
    await page.waitForTimeout(350);
    porCat[cat] = await page.evaluate(marca => {
      const el = document.getElementById('combat-log');
      const linhas = [...(el?.children || [])];
      const visivel = c => getComputedStyle(c).display !== 'none';
      const ativa = [...document.querySelectorAll('#combat-log-tabs .log-tab')].find(b => b.classList.contains('active'));
      // Das linhas-marca injetadas (uma por categoria), quais aparecem agora.
      const marcasVisiveis = linhas
        .filter(c => c.textContent.includes(marca) && visivel(c))
        .map(c => c.dataset.cat);
      return {
        filtro: el?.dataset.filter, abaAtiva: ativa?.dataset.cat,
        visiveis: linhas.filter(visivel).length, total: linhas.length,
        marcasVisiveis,
      };
    }, MARCA);
  }
  log('filtros:', categorias.map(c => `${c}=${porCat[c].visiveis}/${porCat[c].total}`).join(' '));
  for (const cat of categorias) {
    if (porCat[cat].filtro !== cat) problemas.push(`LOG: clicar em "${cat}" não mudou o data-filter (ficou "${porCat[cat].filtro}")`);
    if (porCat[cat].abaAtiva !== cat) problemas.push(`LOG: aba "${cat}" não ficou marcada como ativa (ativa="${porCat[cat].abaAtiva}")`);
  }
  // Veredito pelas linhas-marca: cada aba tem que mostrar A SUA e esconder as
  // outras três. "tudo" tem que mostrar as quatro.
  const esperado = { tudo: 4, combate: 1, magia: 1, suprimento: 1, loot: 1 };
  let filtroOk = true;
  for (const cat of categorias) {
    const vistas = porCat[cat].marcasVisiveis;
    if (vistas.length !== esperado[cat]) {
      problemas.push(`LOG: aba "${cat}" mostra ${vistas.length} linha(s)-marca [${vistas.join(', ')}], esperado ${esperado[cat]}`);
      filtroOk = false;
    } else if (cat !== 'tudo' && vistas[0] !== cat) {
      problemas.push(`LOG: aba "${cat}" está mostrando a linha da categoria "${vistas[0]}"`);
      filtroOk = false;
    }
  }
  if (porCat.tudo.visiveis < porCat.tudo.total) { problemas.push(`LOG: aba "tudo" esconde linhas (${porCat.tudo.visiveis} de ${porCat.tudo.total})`); filtroOk = false; }
  if (filtroOk) ok.push(`abas do log filtram corretamente (cada uma mostra só a sua categoria; na caçada: combate=${porCat.combate.visiveis} magia=${porCat.magia.visiveis} suprimento=${porCat.suprimento.visiveis} loot=${porCat.loot.visiveis})`);
  // Limpa as linhas-marca pra não poluir o log do jogador.
  await page.evaluate(marca => {
    for (const c of [...(document.getElementById('combat-log')?.children || [])]) {
      if (c.textContent.includes(marca)) c.remove();
    }
  }, MARCA);
  await page.evaluate(() => window.setLogFilter && window.setLogFilter('tudo'));

  // ================= UI+BACKEND: FIGHT MODE e DENSIDADE =================
  // Não basta o botão acender: o modo tem que CHEGAR no servidor, senão o
  // jogador escolhe "ofensivo" e luta equilibrado sem nunca perceber.
  for (const [fn, linha, modos, campo] of [
    ['setFightMode', '#fight-mode-row', ['attack', 'balanced', 'defense'], 'fightMode'],
    ['setDensity', '#density-row', ['solo', 'normal', 'pack'], 'density'],
  ]) {
    for (const m of modos) {
      await page.evaluate(([f, v]) => window[f] && window[f](v), [fn, m]);
      await page.waitForTimeout(400);
      const ativos = await page.evaluate(sel => [...document.querySelectorAll(sel + ' button')].filter(b => b.classList.contains('active')).map(b => b.dataset.mode), linha);
      if (ativos.length !== 1) problemas.push(`${fn}: após escolher "${m}" há ${ativos.length} botões ativos (${ativos.join(',')}) — deveria ser 1`);
      else if (ativos[0] !== m) problemas.push(`${fn}: escolhi "${m}" mas o marcado é "${ativos[0]}"`);
      const noEstado = await page.evaluate(c => window.__G[c], campo);
      if (noEstado !== m) problemas.push(`${fn}: escolhi "${m}" mas o estado do jogo (G.${campo}) está "${noEstado}" — a escolha não é aplicada ao combate`);
    }
  }
  await page.evaluate(() => { window.setFightMode && window.setFightMode('balanced'); window.setDensity && window.setDensity('normal'); });
  if (!problemas.some(p => p.startsWith('setFight') || p.startsWith('setDensity'))) ok.push('fight mode e densidade marcam 1 botão e chegam ao estado do jogo');

  // ================= UI: i18n =================
  const cruas = await page.evaluate(() => {
    const box = document.getElementById('battle-modal-box');
    const txt = box ? box.innerText : '';
    return [...new Set((txt.match(/\b[a-z]+\.[a-zA-Z]{3,}[a-zA-Z.]*\b/g) || []).filter(s => /^(battle|hunt|common|ui|spell|log)\./.test(s)))];
  });
  if (cruas.length) problemas.push(`i18n: chave crua visível na janela: ${cruas.join(', ')}`);
  else ok.push('sem chave de tradução crua na tela');

  // ================= UI: LAYOUT desktop =================
  const layout = await page.evaluate(() => {
    const box = document.getElementById('battle-modal-box');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    const estouros = [];
    for (const el of box.querySelectorAll('*')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0) continue;
      if (b.right > r.right + 2 || b.left < r.left - 2) estouros.push((el.id || el.className || el.tagName).toString().slice(0, 40));
    }
    return { rolaHoriz: box.scrollWidth > box.clientWidth + 2, alturaExcede: r.height > window.innerHeight + 4, estouros: [...new Set(estouros)].slice(0, 6) };
  });
  if (layout) {
    if (layout.rolaHoriz) problemas.push('LAYOUT: a janela rola na horizontal (scrollWidth > clientWidth)');
    if (layout.alturaExcede) problemas.push('LAYOUT: a janela é mais alta que a viewport — o rodapé fica inacessível');
    if (layout.estouros.length) problemas.push(`LAYOUT: elementos vazando pra fora da janela: ${layout.estouros.join(', ')}`);
    if (!layout.rolaHoriz && !layout.alturaExcede && !layout.estouros.length) ok.push('layout contido (sem estouro nem vazamento)');
  }

  // ================= UI: MOBILE =================
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(800);
  const mob = await page.evaluate(() => {
    const box = document.getElementById('battle-modal-box');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { rolaHoriz: document.documentElement.scrollWidth > window.innerWidth + 2, larguraExcede: r.width > window.innerWidth + 2 };
  });
  if (mob) {
    if (mob.rolaHoriz) problemas.push('MOBILE(390px): a página rola na horizontal com a janela aberta');
    if (mob.larguraExcede) problemas.push('MOBILE(390px): a janela é mais larga que a tela');
    if (!mob.rolaHoriz && !mob.larguraExcede) ok.push('mobile 390px sem estouro');
  }
  await page.setViewportSize({ width: 1366, height: 900 });

  // ================= SINCRONIA: PARAR =================
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(3000);
  const uiParado = await estadoUI();
  const svParado = await estadoServidor().catch(() => null);
  if (viuCriatura && uiParado.criaturas.length > 0) problemas.push(`PARAR: battle list ainda mostra ${uiParado.criaturas.length} criatura(s) depois de parar — lista fantasma`);
  else if (viuCriatura) ok.push('battle list esvazia ao parar');
  if (svParado && svParado.hunting) problemas.push('PARAR: a janela parou mas o SERVIDOR ainda reporta hunting:true — sessão órfã continua consumindo suprimento');
  else if (svParado) ok.push('servidor confirma caçada encerrada');

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
  log('ERRO', e);
} finally {
  await browser.close();
}

const IGNORAR = /favicon|net::ERR_|Failed to load resource.*40[34]/i;
[...erroConsole].filter(e => !IGNORAR.test(e)).forEach(e => problemas.push('CONSOLE: ' + e));

console.log('\n' + '='.repeat(72));
console.log('AUDITORIA DA JANELA DE COMBATE (UI + sincronia com o servidor)');
console.log('='.repeat(72));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO (não deu pra exercitar):'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  problemas.forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else if (inconclusivos.length) {
  console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas partes não foram exercitadas');
  process.exitCode = 2;
} else {
  console.log('\nRESULTADO: PASSOU — janela de combate sem problemas (UI e sincronia)');
}
