// AUDITORIA VISUAL DA BATALHA — sprite, geometria, fluidez e atraso.
//
// Pedido do Felipe: "auditoria de batalha, foco no visual, sprites, latencia,
// delay". As auditorias que já existiam cobrem DADO (loot, stats, preço) e uma
// fatia de sincronia (audit-sync-dano-fx). O que ninguém mede é o que o jogador
// realmente enxerga durante a caçada:
//
//   1. SPRITE   — imagem que o navegador carregou com sucesso? Um 404 vira um
//                 <img> quebrado silencioso: nada no console, criatura invisível.
//                 Foi assim que 25 tipos de munição ficaram sem projétil.
//   2. GEOMETRIA— criatura/projétil dentro do palco, sem sobreposição grosseira,
//                 sem tamanho zero.
//   3. FLUIDEZ  — intervalo entre quadros durante o combate. Travada é "latência"
//                 do ponto de vista de quem joga, mesmo sem rede envolvida.
//   4. ATRASO   — quanto tempo passa entre o projétil POUSAR e a vida cair. Esse
//                 pareamento é causal no código (COMBAT_PROJECTILE_LANDED); se
//                 regredir, o jogador vê a flecha bater e a barra cair depois.
//
// AUTOTESTE: --mutar=sprite|geometria|fluidez|atraso quebra de propósito o que
// a seção mede. Se a seção mutada continuar PASSANDO, o probe não vale nada e o
// resultado sai como INCONCLUSIVO em vez de verde falso.
//
// Uso: node scripts/audit-batalha-visual.mjs [--zona=troll_cave] [--seg=45] [--mutar=...]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';

const arg = (n, d) => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1] || d;
const ZONA = arg('zona', 'troll_cave');
const SEG = Number(arg('seg', 45));
const MUTAR = arg('mutar', '');

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], ok = [], inconclusivos = [];
const mutou = { sprite: false, fluidez: false, atraso: false, geometria: false };
let vocacao = '?';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);

  // --slot troca de personagem antes de medir. Cada vocação percorre um caminho
  // diferente do combate (knight não dispara projétil nenhum), então auditar
  // sempre o mesmo slot cobre um quarto do que o jogador vê.
  const SLOT = arg('slot', '');
  if (SLOT !== '') {
    const alvo = Number(SLOT);
    const ativo = await page.evaluate(async () => (await window.__liveImport('gameStore.js')).ACCOUNT.activeSlot);
    if (ativo !== alvo) {
      page.on('dialog', d => d.accept());
      await page.evaluate(async (s) => (await window.__liveImport('accountUseCases.js')).confirmSwitchCharacterSlot(s), alvo);
      await esperarReload(page);
      await instalarLiveImport(page);
    }
    const agora = await page.evaluate(async () => {
      const gs = await window.__liveImport('gameStore.js');
      return { slot: gs.ACCOUNT.activeSlot, voc: gs.G.vocation };
    });
    if (agora.slot !== alvo || !agora.voc) {
      inconclusivos.push(`não consegui entrar no slot ${alvo} com personagem (ficou slot ${agora.slot}, vocação ${agora.voc || 'nenhuma'})`);
      throw new Error('sem caçada');
    }
    console.log(`slot ${agora.slot} · vocação ${agora.voc}`);
  }

  await page.evaluate(() => window.openBattleModal && window.openBattleModal());

  // ---------------------------------------------------------------- sensores
  // Instalados ANTES da caçada começar, senão os primeiros segundos (justo os
  // do spawn, onde mora o defeito visual) passam sem ser medidos.
  await page.evaluate((mutar) => {
    const S = window.__vis = {
      imgs: new Map(),      // src -> {ok, w, h, ondes:[]}
      quadros: [],          // intervalos entre frames (ms)
      voos: [],             // {dur, esperado}
      pousos: [],           // instante de COMBAT_PROJECTILE_LANDED
      hps: [],              // instante de mudança de largura de barra
      danos: [],            // idem, só quando a barra ENCOLHE (golpe de verdade)
      geo: [],              // violações de geometria
      erros: [],            // erros de página
      mutado: mutar,
    };

    // -- 1a. O CAMINHO DE FALHA DO PRÓPRIO JOGO. Sprite que não carrega não fica
    // como <img> quebrada: o onerror troca o elemento por um <span> com emoji e
    // marca a URL como falha (tibiaSprites.js: spriteImgOrFallback). Ou seja,
    // procurar por naturalWidth===0 NUNCA acharia nada — quando o probe olha, a
    // <img> já não existe. Esta é a fonte de verdade: o jogo avisando que
    // desistiu da sprite. É também a degradação silenciosa que o jogador vê como
    // "criatura virou emoji".
    S.falhouSprite = [];
    const marcarOriginal = window.__markSpriteFailed;
    window.__markSpriteFailed = (url) => { S.falhouSprite.push(url); return marcarOriginal && marcarOriginal(url); };

    // -- 1b. toda <img> que passar pelo palco/lista é registrada com o estado de
    // carregamento REAL. Rede o suficiente pra pegar o que escapar do onerror.
    const registra = (img, onde) => {
      const src = img.getAttribute('src') || '(sem src)';
      const anota = () => {
        const r = S.imgs.get(src) || { ondes: [] };
        r.ok = img.complete && img.naturalWidth > 0;
        r.w = img.naturalWidth; r.h = img.naturalHeight;
        if (!r.ondes.includes(onde)) r.ondes.push(onde);
        S.imgs.set(src, r);
      };
      if (img.complete) anota();
      else { img.addEventListener('load', anota); img.addEventListener('error', anota); setTimeout(anota, 3000); }
    };
    const varre = () => {
      document.querySelectorAll('#dungeon-stage img').forEach(i => registra(i, 'palco'));
      document.querySelectorAll('#battle-list img').forEach(i => registra(i, 'battle-list'));
      document.querySelectorAll('#hunt-loot img, #hunt-log img').forEach(i => registra(i, 'log/loot'));
    };
    varre();
    new MutationObserver(varre).observe(document.body, { childList: true, subtree: true });

    // -- 1c. O BONECO é <canvas>, não <img> — nenhuma checagem de carregamento
    // se aplica a ele. Canvas em branco = personagem invisível no palco, e isso
    // passaria por todas as outras verificações. Contamos pixels não
    // transparentes: é a única evidência de que alguma coisa foi mesmo desenhada.
    S.bonecoPixels = [];
    S.amostraBoneco = () => {
      const c = document.querySelector('#player-sprite-wrap canvas');
      if (!c || !c.width) { S.bonecoPixels.push(-1); return; }
      try {
        const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
        S.bonecoPixels.push(n);
      } catch (e) { S.bonecoPixels.push(-2); }
    };

    // -- 1d. REGRA DE TAMANHO ATROPELADA. Classe de componente (.monster-sprite)
    // tem especificidade 0-1-0; a regra genérica de ícone (img.tibia-icon) tem
    // 0-1-1 e ganha SEMPRE, independente da ordem no arquivo. O componente
    // continua no CSS, legível e comentado, e simplesmente não vale — foi assim
    // que a "caixa fixa 52x52" das criaturas virou letra morta sem ninguém ver.
    // Aqui perguntamos ao navegador o que ele realmente aplicou.
    S.conflitosCss = () => {
      const regras = [];
      for (const ss of document.styleSheets) {
        let rs; try { rs = ss.cssRules; } catch (e) { continue; }
        for (const r of rs) {
          if (!r.selectorText || !r.style) continue;
          if (!r.style.width && !r.style.height) continue;
          regras.push({ sel: r.selectorText, w: r.style.width, h: r.style.height });
        }
      }
      const achados = [];
      // Varre o documento inteiro, não só o palco: a armadilha é do CSS, não do
      // combate, e um ícone atropelado na aba ao lado é o mesmo defeito.
      document.querySelectorAll('img').forEach(img => {
        const casam = regras.filter(r => { try { return img.matches(r.sel); } catch (e) { return false; } });
        const generica = casam.filter(r => /tibia-icon/.test(r.sel));
        const proprias = casam.filter(r => !/tibia-icon/.test(r.sel));
        if (!generica.length || !proprias.length) return;
        const cs = getComputedStyle(img);
        // `auto` SEMPRE difere do valor computado em px — comparar os dois
        // acusava de atropelada uma regra que estava vencendo (img.dens-icon).
        const bate = (declarado, computado) => !declarado || declarado === 'auto' || declarado === computado;
        proprias.forEach(r => {
          if (!bate(r.h, cs.height)) achados.push(`"${r.sel}" pede height ${r.h}, mas o que vale é ${cs.height} (venceu "${generica[0].sel}")`);
          if (!bate(r.w, cs.width)) achados.push(`"${r.sel}" pede width ${r.w}, mas o que vale é ${cs.width} (venceu "${generica[0].sel}")`);
        });
      });
      return [...new Set(achados)];
    };

    // -- 2. geometria: a cada amostra, confere se cada criatura viva está DENTRO
    // do palco e tem tamanho real. Sprite com 0px é indistinguível de ausente
    // pro jogador, e sprite fora do palco é a criatura que "some" pra ele.
    S.amostraGeo = () => {
      const stage = document.getElementById('dungeon-stage');
      if (!stage) return;
      const sr = stage.getBoundingClientRect();
      document.querySelectorAll('.stage-monster:not(.leaving)').forEach(el => {
        const img = el.querySelector('img');
        const r = (img || el).getBoundingClientRect();
        const uid = el.dataset.uid || '?';
        if (r.width < 8 || r.height < 8) S.geo.push(`criatura ${uid} com sprite de ${Math.round(r.width)}x${Math.round(r.height)}px`);
        // folga de 4px cobre arredondamento de subpixel do layout
        if (r.left < sr.left - 4 || r.right > sr.right + 4 || r.top < sr.top - 4 || r.bottom > sr.bottom + 4)
          S.geo.push(`criatura ${uid} fora do palco (x ${Math.round(r.left - sr.left)}..${Math.round(r.right - sr.left)} de 0..${Math.round(sr.width)})`);
      });
      const proj = document.querySelector('.combat-projectile');
      if (proj) {
        const r = proj.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) S.geo.push(`projétil com ${Math.round(r.width)}x${Math.round(r.height)}px`);
      }
    };

    // -- 3. fluidez: intervalo real entre quadros. Não é FPS médio (que esconde
    // travada curta) — guardamos a série pra olhar o percentil 95 e o pior.
    S.maxPack = 0;
    let ult = performance.now();
    const tick = (t) => {
      S.quadros.push(t - ult); ult = t; S.amostraGeo();
      S.maxPack = Math.max(S.maxPack, document.querySelectorAll('.stage-monster:not(.leaving)').length);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // O boneco é amostrado por FORA do laço de quadros: getImageData de propósito
    // não entra no rAF, senão o próprio sensor criaria a travada que ele mede.
    setInterval(() => S.amostraBoneco(), 1000);

    // -- 4. atraso: pouso do projétil x queda da barra de vida.
    window.__liveImport('eventBus.js').then(({ on, EVENTS }) => {
      on(EVENTS.COMBAT_PROJECTILE_LANDED, () => S.pousos.push(performance.now()));
    }).catch(e => S.erros.push('eventBus: ' + e.message));

    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.target.classList && m.target.classList.contains('stage-monster-hp-fill')) {
          const w = m.target.style.width;
          if (w !== m.target.dataset.ultW) {
            // Só QUEDA conta como dano — a barra também muda quando uma criatura
            // nova entra (0% -> 100%), e contar isso como golpe inflaria a
            // comparação com o retorno visual logo abaixo.
            const antes = parseFloat(m.target.dataset.ultW || '100');
            const agora = parseFloat(w);
            m.target.dataset.ultW = w;
            S.hps.push(performance.now());
            if (agora < antes) S.danos.push(performance.now());
          }
        }
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });

    // -- 4b. RETORNO VISUAL DO GOLPE CORPO A CORPO. O knight não dispara nada,
    // então o pareamento projétil→vida não existe pra ele e a vocação inteira
    // ficava sem auditoria de sincronia. O equivalente é o tremor/flash de dano:
    // se a vida cai e NADA pisca, o jogador vê número mudando sem golpe.
    S.flashes = [];
    S.flashPalco = 0; S.flashLista = 0;
    const ehFlash = (el) => {
      const c = el.classList;
      if (!c) return null;
      if (c.contains('monster-sprite-wrap') && c.contains('hit')) return 'palco';
      if (c.contains('battle-list-entry') && c.contains('hit-flash')) return 'lista';
      return null;
    };
    const contaFlash = (onde) => {
      S.flashes.push(performance.now());
      if (onde === 'palco') S.flashPalco++; else S.flashLista++;
    };
    // DUAS formas de um flash aparecer, e observar só a primeira dava zero:
    //  - classe ADICIONADA a um elemento que já estava na tela (palco);
    //  - elemento NASCENDO já com a classe. A Battle List é reconstruída por
    //    innerHTML a cada render, então o "hit" vem dentro do HTML e nenhuma
    //    mutação de atributo acontece.
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes') { const o = ehFlash(m.target); if (o) contaFlash(o); continue; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const o = ehFlash(n); if (o) contaFlash(o);
          n.querySelectorAll && n.querySelectorAll('.monster-sprite-wrap.hit, .battle-list-entry.hit-flash').forEach(el => contaFlash(ehFlash(el)));
        }
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });

    // -- voo do projétil: duração medida ponta a ponta.
    const stage = document.getElementById('dungeon-stage');
    if (stage) new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n.classList && n.classList.contains('combat-projectile')) {
          const t0 = performance.now();
          const esperado = parseFloat(n.style.transitionDuration) * (/ms$/.test(n.style.transitionDuration) ? 1 : 1000);
          const fim = () => S.voos.push({ dur: performance.now() - t0, esperado });
          n.addEventListener('transitionend', fim, { once: true });
        }
      }
    }).observe(stage, { childList: true });

    window.addEventListener('error', e => S.erros.push(String(e.message || e)));

    // ------------------------------------------------------------- MUTAÇÕES
    // Cada uma quebra exatamente uma seção, pra provar que aquela seção sabe
    // reprovar. Sem isto, um "PASSOU" pode ser só o probe medindo nada.
    if (mutar === 'sprite') {
      const mo = new MutationObserver(() => {
        document.querySelectorAll('#dungeon-stage img:not([data-mutado])').forEach(i => {
          i.dataset.mutado = '1'; i.src = i.src.replace(/[^/]+$/, 'nao-existe-mutacao.png');
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
    if (mutar === 'fluidez') {
      setInterval(() => { const t = performance.now(); while (performance.now() - t < 220); }, 700);
    }
    if (mutar === 'geometria') {
      setInterval(() => document.querySelectorAll('.stage-monster img').forEach(i => { i.style.width = '3px'; i.style.height = '3px'; }), 300);
    }
    if (mutar === 'atraso') {
      // empurra toda mudança de barra pra 1,2s depois do pouso
      const origem = S.hps;
      S.hps = new Proxy(origem, { get: (t, k) => (k === 'push' ? (v => Array.prototype.push.call(t, v + 1200)) : t[k]) });
    }
  }, MUTAR);

  // ------------------------------------------------------------------ caçada
  // PRÉ-CONDIÇÃO explícita. Sem ela o probe dizia só "a caçada não começou", o
  // que soa como defeito do jogo — e a causa real era a conta de teste sem
  // personagem depois do reset. Diagnóstico errado custa mais que teste ausente.
  const pre = await page.evaluate(() => ({ voc: window.__G.vocation, hp: window.__G.hp, level: window.__G.level }));
  if (!pre.voc) { inconclusivos.push('a conta de teste está SEM PERSONAGEM — rode scripts/criar-char-teste.mjs antes'); throw new Error('sem caçada'); }
  if (pre.hp <= 0) { inconclusivos.push(`personagem com ${pre.hp} de vida (morto) — não dá pra caçar`); throw new Error('sem caçada'); }

  const iniciou = await page.evaluate(async (cfg) => {
    // Densidade "pack" enche o palco (até 8 criaturas). Com uma criatura por vez
    // metade do que esta auditoria existe pra ver nem acontece: fileira lado a
    // lado, sobreposição, magia de área e o custo de desenhar tudo junto.
    window.__G.density = cfg.densidade;
    window.__H.selectZone(cfg.zona);
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
    await new Promise(r => setTimeout(r, 1500));
    return !!window.__G.hunting;
  }, { zona: ZONA, densidade: arg('densidade', 'pack') });
  if (!iniciou) { inconclusivos.push(`a caçada não começou em "${ZONA}" — nada foi medido`); throw new Error('sem caçada'); }

  await page.waitForTimeout(SEG * 1000);
  const d = await page.evaluate(() => {
    const S = window.__vis;
    return {
      imgs: [...S.imgs.entries()].map(([src, r]) => ({ src, ...r })),
      quadros: S.quadros, voos: S.voos, pousos: S.pousos, hps: S.hps,
      geo: [...new Set(S.geo)], erros: [...new Set(S.erros)],
      falhouSprite: [...new Set(S.falhouSprite)],
      bonecoPixels: S.bonecoPixels,
      conflitosCss: S.conflitosCss(),
      maxPack: S.maxPack,
      voc: window.__G.vocation,
      danos: S.danos, flashes: S.flashes, flashPalco: S.flashPalco, flashLista: S.flashLista,
      emojiFallback: document.querySelectorAll('#dungeon-stage span:not([class*="hp"]), #battle-list span.monster-sprite').length,
    };
  });
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });

  vocacao = d.voc || '?';
  const pct = (a, p) => a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : null;

  // ---------------------------------------------------------------- 1. SPRITE
  const quebradas = d.imgs.filter(i => i.ok === false);
  const falhas = [...new Set([...d.falhouSprite, ...quebradas.map(q => q.src)])];
  console.log(`\nimagens vistas: ${d.imgs.length} · falhas de sprite: ${falhas.length} · fallback emoji na tela: ${d.emojiFallback} · palco mais cheio: ${d.maxPack} criatura(s)`);
  // Sem palco cheio, boa parte do que esta auditoria mede não chegou a existir.
  if (d.maxPack < 2) inconclusivos.push(`o palco nunca teve mais de ${d.maxPack} criatura — fileira lado a lado e magia de área não foram exercitadas`);
  if (!d.imgs.length) inconclusivos.push('nenhuma imagem apareceu no palco — nada a conferir');
  else if (falhas.length) {
    mutou.sprite = true;
    falhas.slice(0, 8).forEach(u => problemas.push(`sprite não carregou (virou emoji pro jogador): ${String(u).split('/').pop()}`));
    if (falhas.length > 8) problemas.push(`... e mais ${falhas.length - 8} sprite(s) quebrada(s)`);
  } else ok.push(`${d.imgs.length} sprites carregaram, nenhuma caiu pro emoji`);

  // ------------------------------------------------------- 1c. boneco (canvas)
  const amostras = d.bonecoPixels.filter(n => n !== undefined);
  const vazias = amostras.filter(n => n <= 0).length;
  if (!amostras.length) inconclusivos.push('boneco não foi amostrado — canvas do personagem não encontrado');
  else if (vazias === amostras.length) {
    mutou.sprite = true;
    problemas.push(`o boneco do jogador está INVISÍVEL no palco (canvas sem pixel desenhado em ${amostras.length} amostras)`);
  } else if (vazias) inconclusivos.push(`boneco vazio em ${vazias}/${amostras.length} amostras — pode ser o intervalo entre quadros da animação`);
  else ok.push(`boneco desenhado no palco (mediana ${pct(amostras, 0.5)} pixels visíveis)`);

  // ------------------------------------------------- 1d. regra atropelada
  if (d.conflitosCss.length) {
    mutou.geometria = true;
    d.conflitosCss.slice(0, 5).forEach(c => problemas.push('regra de tamanho sem efeito: ' + c));
    if (d.conflitosCss.length > 5) problemas.push(`... e mais ${d.conflitosCss.length - 5} regra(s) atropelada(s)`);
  } else ok.push('as regras de tamanho dos sprites do combate estão de fato valendo');

  // ------------------------------------------------------------- 2. GEOMETRIA
  if (d.geo.length) {
    mutou.geometria = true;
    d.geo.slice(0, 6).forEach(g => problemas.push('geometria: ' + g));
    if (d.geo.length > 6) problemas.push(`... e mais ${d.geo.length - 6} violação(ões) de geometria`);
  } else ok.push('criaturas e projéteis dentro do palco, com tamanho visível');

  // --------------------------------------------------------------- 3. FLUIDEZ
  // A taxa BASE não vale como veredito: o Chromium headless entrega ~30Hz, não
  // os 60Hz da máquina do jogador. Comparar com 16,7ms reprovaria um jogo
  // saudável (ou absolveria um travado, se o headless fosse mais rápido). O que
  // viaja entre ambientes é o quanto o combate DESVIA do próprio ritmo: engasgo
  // é quadro muito mais longo que a mediana daquela mesma sessão.
  if (d.quadros.length < 60) inconclusivos.push(`só ${d.quadros.length} quadros medidos — amostra curta demais pra julgar fluidez`);
  else {
    const p50 = pct(d.quadros, 0.5), p95 = pct(d.quadros, 0.95), pior = Math.max(...d.quadros);
    const perdidos = d.quadros.filter(q => q > p50 * 3).length;
    const taxaPerdidos = perdidos / d.quadros.length;
    console.log(`quadros: ${d.quadros.length} · p50 ${p50.toFixed(1)}ms · p95 ${p95.toFixed(1)}ms · pior ${pior.toFixed(0)}ms · engasgos ${perdidos} (${(taxaPerdidos * 100).toFixed(1)}%)`);
    if (taxaPerdidos > 0.01) { mutou.fluidez = true; problemas.push(`combate engasga: ${(taxaPerdidos * 100).toFixed(1)}% dos quadros passam de 3x a mediana (${perdidos} de ${d.quadros.length})`); }
    else if (pior > p50 * 8) { mutou.fluidez = true; problemas.push(`travada de ${pior.toFixed(0)}ms durante o combate (${(pior / p50).toFixed(0)}x a mediana de ${p50.toFixed(0)}ms)`); }
    else ok.push(`fluidez estável (p50 ${p50.toFixed(1)}ms · p95 ${p95.toFixed(1)}ms · pior ${pior.toFixed(0)}ms · ${perdidos} engasgo(s))`);
  }

  // ---------------------------------------------------------------- 4. ATRASO
  if (d.voos.length) {
    const desvios = d.voos.filter(v => v.esperado && Math.abs(v.dur - v.esperado) > Math.max(80, v.esperado * 0.4));
    const md = d.voos.reduce((s, v) => s + v.dur, 0) / d.voos.length;
    console.log(`voos de projétil: ${d.voos.length} · duração média ${md.toFixed(0)}ms · esperado ${d.voos[0].esperado || '?'}ms`);
    if (desvios.length > d.voos.length / 2) problemas.push(`projétil voa em ${md.toFixed(0)}ms, mas a animação pede ${d.voos[0].esperado}ms`);
    else ok.push(`voo do projétil bate com a duração configurada (${md.toFixed(0)}ms)`);
  } else inconclusivos.push('nenhum projétil voou — vocação corpo a corpo ou sem munição; atraso pouso→dano não medido');

  // -------------------------------------------- 4b. retorno visual do golpe
  // Vale pra TODA vocação, mas é a única sincronia que dá pra medir no corpo a
  // corpo. Comparação por proporção, não 1:1: vários golpes podem cair no mesmo
  // quadro e virar um flash só.
  console.log(`quedas de vida: ${d.danos.length} · flashes: ${d.flashes.length} (palco ${d.flashPalco} · battle list ${d.flashLista})`);
  // Distinguir ONDE piscou importa: se só a Battle List reage, a criatura no
  // palco — pra onde o jogador está olhando — apanha sem dar sinal.
  if (d.danos.length >= 5 && d.flashes.length && !d.flashPalco) {
    problemas.push(`a criatura no PALCO nunca piscou ao apanhar (${d.flashLista} flashes, todos só na Battle List) — o golpe não tem retorno onde o jogador está olhando`);
  }
  if (d.danos.length < 5) inconclusivos.push(`só ${d.danos.length} queda(s) de vida — retorno visual do golpe não medido`);
  else if (!d.flashes.length) problemas.push(`a vida caiu ${d.danos.length}x e NADA piscou na tela — golpe sem retorno visual nenhum`);
  else {
    const razao = d.flashes.length / d.danos.length;
    if (razao < 0.3) problemas.push(`só ${(razao * 100).toFixed(0)}% das quedas de vida tiveram flash de dano (${d.flashes.length} de ${d.danos.length}) — golpe quase sempre invisível`);
    else ok.push(`golpe tem retorno visual (${d.flashes.length} flashes para ${d.danos.length} quedas de vida)`);
  }

  if (d.pousos.length < 3) inconclusivos.push(`só ${d.pousos.length} pouso(s) de projétil — atraso pouso→dano não medido`);
  else {
    const atrasos = [];
    for (const t of d.pousos) { const p = d.hps.find(h => h >= t); if (p != null && p - t < 4000) atrasos.push(p - t); }
    if (atrasos.length < 3) inconclusivos.push('pousos sem queda de vida correspondente — pareamento não pôde ser medido');
    else {
      const mediana = pct(atrasos, 0.5), pior = Math.max(...atrasos);
      console.log(`atraso pouso→vida: mediana ${mediana.toFixed(0)}ms · pior ${pior.toFixed(0)}ms (${atrasos.length} amostras)`);
      // O pareamento é causal: a barra cai NO evento de pouso. Só sobra o custo
      // de renderizar. Acima de 150ms deixou de ser render e virou outro relógio.
      if (mediana > 150) { mutou.atraso = true; problemas.push(`a vida cai ${mediana.toFixed(0)}ms depois do projétil pousar — o pareamento causal regrediu`); }
      else ok.push(`vida cai junto com o pouso do projétil (mediana ${mediana.toFixed(0)}ms)`);
    }
  }

  if (d.erros.length) d.erros.slice(0, 5).forEach(e => problemas.push('erro de página durante o combate: ' + e));

} catch (e) {
  if (!/sem caçada/.test(e.message || '')) problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(66));
console.log(`AUDITORIA VISUAL DA BATALHA — ${vocacao}` + (MUTAR ? `  [autoteste: mutando "${MUTAR}"]` : ''));
console.log('='.repeat(66));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) { console.log(`\n${problemas.length} problema(s):`); problemas.forEach(p => console.log('  ✗ ' + p)); }

// Em modo autoteste o veredito é sobre O PROBE, não sobre o jogo: a seção
// sabotada TEM que reprovar. Se ela passar, o "PASSOU" normal não vale nada.
if (MUTAR) {
  // Rodada que morreu no meio (rede caiu, deploy em curso) não diz NADA sobre o
  // probe. Chamar isso de "furado" seria inverter o diagnóstico — foi o que
  // aconteceu num ERR_CONNECTION_RESET durante o deploy.
  const abortou = problemas.some(p => /^EXCEÇÃO/.test(p)) || inconclusivos.some(i => /SEM PERSONAGEM|não começou|morto/.test(i));
  if (abortou) { console.log('\nRESULTADO: INCONCLUSIVO — a rodada não chegou ao fim; o autoteste não pôde julgar o probe'); process.exitCode = 2; }
  else if (mutou[MUTAR]) { console.log(`\nRESULTADO: PROBE CONFIÁVEL — a seção "${MUTAR}" reprovou quando sabotada`); }
  else { console.log(`\nRESULTADO: PROBE FURADO — sabotei "${MUTAR}" e a seção não reclamou; o verde dela é vazio`); process.exitCode = 3; }
} else if (problemas.length) { console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`); process.exitCode = 1; }
else if (inconclusivos.length) { console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas nem tudo foi exercitado'); process.exitCode = 2; }
else console.log('\nRESULTADO: PASSOU');
