// AUDITORIA DA GRADUAÇÃO (nível 8) — a tela aparece, o kit certo é mostrado
// para cada vocação, a escolha vale, e o servidor concorda.
//
// Duas camadas, como o Felipe pediu:
//   UI       — a tela abre sozinha, os 4 botões de vocação trocam o kit
//              mostrado, o texto muda entre "manter" e "trocar".
//   BACKEND  — depois de graduar, o servidor marca graduated e o equipamento
//              muda lá também. Sem isso o combate seguiria com o kit velho,
//              porque quem calcula a luta é o servidor (huntEngine).
//
// LIMITE HONESTO deste probe: graduação é evento de UMA VEZ por personagem.
// Ele valida as 4 vocações na PRÉVIA do kit (que é o que a tela mostra) mas só
// consegue graduar de fato uma vez. Graduar realmente nas 4 exige 4
// personagens — ver scripts/audit-graduacao-4voc.mjs.
//
// Uso: node scripts/audit-graduacao.mjs [vocacaoAlvo]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ALVO = process.argv[2] || null;   // vocação a escolher; null = manter a atual
const log = (...a) => console.log('[grad]', ...a);

const problemas = [], inconclusivos = [], ok = [];
const erroConsole = new Set();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.on('console', m => { if (m.type() === 'error') erroConsole.add(m.text().slice(0, 240)); });
page.on('pageerror', e => erroConsole.add('pageerror: ' + (e.message || String(e)).slice(0, 240)));

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);

  const antes = await page.evaluate(() => ({
    level: window.__G.level, voc: window.__G.vocation, graduated: window.__G.graduated,
    equip: { ...window.__G.equipment },
  }));
  log('personagem:', JSON.stringify(antes));

  if (antes.level < 8) {
    inconclusivos.push(`personagem está no nível ${antes.level} — abaixo do nível de graduação, a tela não deve aparecer mesmo`);
  }

  // ---------- 1. A TELA APARECE SOZINHA ----------
  await page.waitForTimeout(2500);
  const apareceu = await page.isVisible('#graduation-box').catch(() => false);
  if (antes.graduated) {
    if (apareceu) problemas.push('personagem JÁ graduou mas a tela apareceu de novo — daria pra pegar o kit várias vezes');
    else ok.push('personagem já graduado não vê a tela de novo');
    inconclusivos.push('personagem já graduado — o fluxo de graduar não pôde ser exercitado nesta conta');
  } else if (antes.level >= 8) {
    if (!apareceu) problemas.push('nível >= 8 e não graduado, mas a tela de graduação NÃO apareceu ao entrar');
    else ok.push('tela de graduação aparece sozinha ao entrar');
  }

  if (apareceu && !antes.graduated) {
    // ---------- 2. NÃO PODE SER DISPENSADA POR CLIQUE FORA ----------
    // A graduação decide a vocação definitiva e entrega equipamento; fechar sem
    // querer deixaria o jogador sem os dois até o próximo carregamento.
    await page.mouse.click(8, 8);
    await page.waitForTimeout(400);
    if (!await page.isVisible('#graduation-box')) problemas.push('a tela fechou com clique fora — a escolha de vocação some sem ter sido feita');
    else ok.push('tela não fecha por clique fora');

    // ---------- 3. OS 4 BOTÕES TROCAM O KIT MOSTRADO ----------
    const VOCS = ['knight', 'paladin', 'sorcerer', 'druid'];
    const kits = {};
    for (const v of VOCS) {
      await page.evaluate(x => window.pickGraduationVocation(x), v);
      await page.waitForTimeout(250);
      kits[v] = await page.evaluate(() => ({
        itens: [...document.querySelectorAll('.grad-kit-item')].map(e => (e.innerText || '').trim().split('\n')[0]),
        ativo: document.querySelector('.grad-voc.active')?.querySelector('.grad-voc-name')?.textContent?.trim(),
        botao: document.getElementById('graduation-confirm')?.innerText?.trim(),
      }));
      if (!kits[v].itens.length) problemas.push(`vocação ${v}: a prévia do kit ficou VAZIA`);
      if (!kits[v].ativo) problemas.push(`vocação ${v}: nenhum botão ficou marcado como ativo`);
    }
    log('kits por vocação:');
    for (const v of VOCS) log(`   ${v.padEnd(9)} ${kits[v].itens.join(', ')}`);

    // Cada vocação tem que mostrar um kit DIFERENTE — se dois vierem iguais, a
    // tela está ignorando a escolha (foi assim que a lista branca de projéteis
    // passou despercebida: tudo "funcionava", mas era sempre o mesmo).
    const assinaturas = VOCS.map(v => kits[v].itens.join('|'));
    const distintas = new Set(assinaturas).size;
    if (distintas < 4) problemas.push(`os 4 kits deveriam ser distintos, mas só há ${distintas} combinações diferentes — a tela não reage à vocação escolhida`);
    else ok.push('as 4 vocações mostram kits distintos');

    // O texto do botão precisa distinguir manter de trocar.
    const btnManter = kits[antes.voc]?.botao;
    const outra = VOCS.find(v => v !== antes.voc);
    if (btnManter && kits[outra].botao === btnManter) problemas.push('o botão de confirmar tem o MESMO texto pra manter e pra trocar de vocação');
    else if (btnManter) ok.push('o botão distingue manter de trocar de vocação');

    // ---------- 4. GRADUAR DE VERDADE ----------
    const escolhida = ALVO || antes.voc;
    await page.evaluate(v => window.pickGraduationVocation(v), escolhida);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.confirmGraduation());
    await page.waitForTimeout(3500);

    if (await page.isVisible('#graduation-box')) problemas.push('confirmei a graduação e a tela continuou aberta');
    else ok.push('a tela fecha ao confirmar');

    const depois = await page.evaluate(() => ({
      voc: window.__G.vocation, graduated: window.__G.graduated,
      equip: { ...window.__G.equipment }, inv: { ...window.__G.inventory },
    }));
    if (!depois.graduated) problemas.push('graduei mas G.graduated continua false');
    else ok.push('estado local marcado como graduado');
    if (depois.voc !== escolhida) problemas.push(`escolhi ${escolhida} mas a vocação ficou ${depois.voc}`);
    else ok.push(`vocação definitiva aplicada (${escolhida})`);

    // O kit tem que estar no INVENTÁRIO (equipar é outra regra — só slot vazio
    // ou peça do kit inicial, pra não rebaixar quem achou algo melhor).
    const doKit = await page.evaluate(async v => {
      const { GRADUATE_KITS } = await window.__liveImport('items.js');
      return Object.values(GRADUATE_KITS[v] || {});
    }, escolhida);
    const faltando = doKit.filter(id => !(depois.inv[id] > 0));
    if (faltando.length) problemas.push(`itens do Graduate Set que NÃO chegaram no inventário: ${faltando.join(', ')}`);
    else ok.push(`Graduate Set inteiro no inventário (${doKit.length} itens)`);

    // ---------- 5. O SERVIDOR CONCORDA ----------
    // Relê com tentativas: a rota de graduação escreve inventário, equipamento
    // e SÓ ENTÃO o stats.graduated. Uma leitura única logo depois pode cair no
    // meio da rota e ver o kit já gravado com o flag ainda false — foi
    // exatamente o falso positivo que este probe deu na primeira execução.
    let sv = null;
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      sv = await lerServidor();
      if (sv && sv.stats && sv.stats.graduated) break;
      await page.waitForTimeout(1200);
    }
    async function lerServidor() { return page.evaluate(async () => {
      const ac = await window.__liveImport('authClient.js');
      const gs = await window.__liveImport('gameStore.js');
      const r = await ac.getHuntState(gs.ACCOUNT.activeSlot);
      return { stats: r && r.stats ? { graduated: r.stats.graduated, level: r.stats.level } : null,
               inv: (r && r.inventory) || {} };
    }).catch(() => null); }
    if (!sv || !sv.stats) {
      inconclusivos.push('não consegui ler o estado do servidor — a persistência da graduação não foi conferida');
    } else {
      if (!sv.stats.graduated) problemas.push('o SERVIDOR não marcou graduated — na próxima entrada dá pra graduar de novo e pegar o kit outra vez');
      else ok.push('servidor marcou graduated');
      const faltaSv = doKit.filter(id => !(sv.inv[id] > 0));
      if (faltaSv.length) problemas.push(`Graduate Set ausente no inventário do SERVIDOR: ${faltaSv.join(', ')} — o combate seguiria com o equipamento velho`);
      else ok.push('Graduate Set presente também no servidor');
    }

    // ---------- 6. NÃO DÁ PRA GRADUAR DUAS VEZES ----------
    const segunda = await page.evaluate(async () => {
      const ac = await window.__liveImport('authClient.js');
      const gs = await window.__liveImport('gameStore.js');
      try { return await ac.grantGraduateKit(gs.ACCOUNT.activeSlot, 'knight'); }
      catch (e) { return { erro: e.message || String(e) }; }
    });
    const recusou = !!(segunda && (segunda.erro || segunda.error));
    if (!recusou) problemas.push('o servidor ACEITOU uma segunda graduação — dá pra trocar de vocação e acumular kit à vontade');
    else ok.push('servidor recusa graduação repetida');
  }

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
  log('ERRO', e);
} finally {
  await browser.close();
}

const IGNORAR = /favicon|net::ERR_|Failed to load resource.*40[349]/i;
[...erroConsole].filter(e => !IGNORAR.test(e)).forEach(e => problemas.push('CONSOLE: ' + e));

console.log('\n' + '='.repeat(70));
console.log('AUDITORIA DA GRADUAÇÃO (nível 8)');
console.log('='.repeat(70));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  problemas.forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else if (inconclusivos.length) {
  console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas partes não foram exercitadas');
  process.exitCode = 2;
} else {
  console.log('\nRESULTADO: PASSOU — graduação consistente na UI e no servidor');
}
