// Teste do cenário de batalha: mede o deslocamento (--scene-y) ao longo de uma
// caçada real e verifica as três regras que o Felipe pediu:
//   1. enquanto procura, a cena rola pra frente (offset cresce)
//   2. quando o monstro aparece, a cena PARA onde estava — sem saltar
//   3. a parada acontece num múltiplo de 32px (a passada fecha)
// Também confere que nenhuma animação CSS está mexendo no ::before do bioma
// (foi esse conflito que fez a cena tremer).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONE = process.argv[2] || 'troll_cave';
const SECS = +(process.argv[3] || 60);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.add('CONSOLE ' + m.text().slice(0, 180)); });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(8000);

  // cria personagem se a conta estiver zerada (createCharacter EXIGE um nome)
  const made = await page.evaluate(async () => {
    // Só cria se a conta estiver mesmo vazia. (Este probe já sobrescreveu o
    // Paladino do slot 1 uma vez criando um Knight por cima — por isso o aviso.)
    const btn = document.querySelector('.voc-btn[data-voc="knight"]');
    if (!btn || btn.offsetParent === null) return 'ja tinha personagem';
    const input = document.getElementById('char-name-input');
    if (input) { input.value = 'AuditBot'; input.dispatchEvent(new Event('input', { bubbles: true })); }
    await window.createCharacter('knight');
    return 'criado';
  });
  console.log('personagem:', made);
  await page.waitForTimeout(6000);

  // Para a caçada anterior antes de trocar de zona: selectZone() reinicia a
  // caçada sozinho quando já está caçando, então chamar startHunt() em seguida
  // abre uma SEGUNDA sessão no servidor e o cliente passa a seguir a errada
  // (nenhum monstro aparece). Um /start só.
  // Expõe o estado pro waitForFunction poder observar sem reimportar módulo.
  await page.evaluate(async () => {
    window.__G = (await import('./src/application/gameStore.js?v=166')).G;
    window.__H = await import('./src/application/huntUseCases.js?v=229');
  });
  // Para a caçada anterior e ESPERA parar de fato — selectZone() reinicia a
  // caçada sozinho se ainda estiver ativa, e aí o startHunt() seguinte abre uma
  // SEGUNDA sessão no servidor; o cliente passa a seguir a errada e nenhum
  // monstro aparece. Dormir por tempo fixo não garantia isso.
  const started = await page.evaluate(async (z) => {
    if (window.__G.hunting) window.toggleHunt();
    return true;
  }, ZONE);
  await page.waitForFunction(() => window.__G && !window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(z => window.__H.selectZone(z), ZONE);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__H.startHunt());
  await page.waitForFunction(() => window.__G.hunting, null, { timeout: 20000 }).catch(() => {});
  console.log('caçada iniciada:', await page.evaluate(() => window.__G.hunting), '| zona:', await page.evaluate(() => window.__G.activeZone));
  // A janela de batalha precisa estar ABERTA: o palco (e o #stage-pack) só é
  // populado com ela visível. Sem isso o teste media um palco vazio e concluía
  // que a caçada não estava rodando.
  await page.evaluate(() => {
    const o = document.getElementById('battle-modal-overlay');
    if (o) o.style.display = 'flex';
  });
  await page.waitForTimeout(500);

  // Espera o primeiro monstro materializar. Sem isso a medição pode rodar uma
  // janela inteira só em "procurando" e não testar nada do que interessa (a
  // parada), dando um falso negativo.
  const apareceu = await page.waitForFunction(
    () => (document.getElementById('stage-pack') || { children: [] }).children.length > 0,
    null, { timeout: 60000 }
  ).then(() => true).catch(() => false);
  console.log('primeiro monstro apareceu:', apareceu);
  if (!apareceu) console.log('AVISO: nenhum monstro em 60s — a parte 1 (caçada real) fica sem cobertura; a parte 2 (transição dirigida) ainda vale.');

  // ---- amostragem: offset da cena + se há monstro na frente, a cada 250ms ----
  const samples = await page.evaluate(async (secs) => {
    const stage = document.getElementById('dungeon-stage');
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      const cs = getComputedStyle(stage, '::before');
      out.push({
        t: Math.round(performance.now() - t0),
        y: parseFloat(stage.style.getPropertyValue('--scene-y')) || 0,
        bgPos: cs.backgroundPosition,
        anim: cs.animationName,
        searching: stage.classList.contains('searching'),
        // quantos monstros estão materializados no palco — a verdade
        // independente da classe CSS
        naTela: (document.getElementById('stage-pack') || { children: [] }).children.length,
        biome: stage.dataset.biome || '',
      });
      await new Promise(r => setTimeout(r, 60));
    }
    return out;
  }, SECS);

  await page.evaluate(() => window.toggleHunt && window.toggleHunt());
  await page.waitForTimeout(1200);

  // ---------------- análise ----------------
  const biome = samples[0]?.biome;
  const anims = [...new Set(samples.map(s => s.anim))];
  console.log(`\nbioma: "${biome}" | animações CSS no ::before: ${anims.join(', ')}`);

  let saltos = [], paradasForaDoPasso = [], regressoes = 0, avancou = 0;
  // Depois que o monstro aparece a cena AINDA anda um pouco: é a passada
  // fechando (comportamento pedido). `fechando` fica ligado até o offset cair
  // num múltiplo de 32; movimento depois disso é bug de verdade.
  // Se a amostragem já começou com a passada em curso (monstro apareceu antes
  // do primeiro sample), assume fechando — senão esse trecho legítimo vira
  // "mexeu parado".
  const restoInicial = ((samples[0].y % 32) + 32) % 32;
  let fechando = !samples[0].searching && Math.min(restoInicial, 32 - restoInicial) > 1.5;
  let yAoParar = fechando ? samples[0].y : 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const d = b.y - a.y;
    if (d > 0) avancou++;
    // regressão = a cena voltou (o "salto" que o Felipe viu). Ignora a volta
    // natural do loop de 1024px.
    if (d < -1 && !(a.y > 900 && b.y < 200)) regressoes++;

    if (a.searching && !b.searching) { fechando = true; yAoParar = a.y; }
    if (fechando) {
      const resto = ((b.y % 32) + 32) % 32;
      const naGrade = Math.min(resto, 32 - resto) <= 1.5;
      // a passada não pode andar mais que um tile inteiro pra fechar
      if (b.y - yAoParar > 37) paradasForaDoPasso.push({ t: b.t, andouAlemDoPasso: +(b.y - yAoParar).toFixed(1) });
      if (naGrade || b.y - yAoParar > 37) fechando = false;
    } else if (!a.searching && !b.searching && Math.abs(d) > 0.6) {
      // parado de verdade: a cena não pode se mexer nem um pixel
      saltos.push({ t: b.t, de: +a.y.toFixed(1), para: +b.y.toFixed(1), motivo: 'mexeu parado' });
    }
    // salto brusco no instante da parada (o bug original: voltava pro começo)
    if (a.searching && !b.searching && Math.abs(d) > 37) saltos.push({ t: b.t, de: +a.y.toFixed(1), para: +b.y.toFixed(1), motivo: 'saltou ao parar' });
  }
  const transicoes = samples.filter((s, i) => i && samples[i - 1].searching !== s.searching).length;
  const procurando = samples.filter(s => s.searching).length;
  const comMonstro = samples.filter(s => s.naTela > 0).length;

  console.log(`amostras: ${samples.length} | classe .searching: ${procurando} | com monstro no palco: ${comMonstro} | avanços: ${avancou} | trocas: ${transicoes}`);
  console.log(`REGRESSÕES (cena saltou pra trás): ${regressoes}`);
  console.log(`SALTOS na parada / movimento parado: ${saltos.length}`, saltos.slice(0, 5));
  console.log(`PARADAS fora do múltiplo de 32px: ${paradasForaDoPasso.length}`, paradasForaDoPasso.slice(0, 5));

  // ---- 2ª parte: transição andando->parado, de forma determinística ----
  // Numa sala que reenche na hora (rat_cave) o estado "procurando" quase não
  // acontece, então a caçada real raramente exercita a PARADA. Aqui o módulo é
  // dirigido direto: anda 2s, manda parar, e mede o que acontece depois.
  const trans = await page.evaluate(async () => {
    const sw = await import('./src/ui/stageWalk.js?v=3');
    const stage = document.getElementById('dungeon-stage');
    const y = () => parseFloat(stage.style.getPropertyValue('--scene-y')) || 0;
    sw.setStageWalking(true);
    await new Promise(r => setTimeout(r, 2000));
    const andando = y();
    sw.setStageWalking(false);
    const noPedidoDeParar = y();
    // acompanha o fechamento da passada
    const depois = [];
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 50)); depois.push(y()); }
    const final = depois[depois.length - 1];
    // e confirma que fica REALMENTE parado por mais 1s
    await new Promise(r => setTimeout(r, 1000));
    return { andando, noPedidoDeParar, final, aindaParado: y() === final, andouEnquanto2s: andando > 100 };
  });
  const resto = ((trans.final % 32) + 32) % 32;
  const naGrade = Math.min(resto, 32 - resto) < 0.001;
  const fechouPassada = trans.final >= trans.noPedidoDeParar && (trans.final - trans.noPedidoDeParar) <= 32.001;
  console.log(`\ntransição dirigida: andou 2s -> ${trans.andando.toFixed(1)}px | pediu parar em ${trans.noPedidoDeParar.toFixed(1)} | fechou em ${trans.final.toFixed(1)}`);
  console.log(`  fechou a passada (<=32px, sem voltar): ${fechouPassada} | parou num múltiplo de 32: ${naGrade} | continuou parado: ${trans.aindaParado}`);

  const ok = regressoes === 0 && saltos.length === 0 && paradasForaDoPasso.length === 0
    && anims.every(a => a === 'none')
    && trans.andouEnquanto2s && fechouPassada && naGrade && trans.aindaParado;
  console.log(`\nRESULTADO: ${ok ? 'PASSOU' : 'FALHOU'}`);
} catch (e) {
  console.log('EX', e.message);
} finally {
  console.log('erros de página:', [...errs].join(' | ') || 'nenhum');
  await browser.close();
}
