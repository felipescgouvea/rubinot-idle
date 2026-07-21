// AUDITORIA GERAL da aplicação, aba por aba, na produção.
//
// Procura problemas que passam despercebidos porque não quebram o jogo:
//   1. erro de JavaScript / console
//   2. imagem que não carrega (sprite 404, caminho errado)
//   3. chave de tradução crua na tela ("zone.xyz" em vez do nome)
//   4. estouro horizontal (barra de rolagem lateral)
//   5. painel vazio (aba abre sem conteúdo)
//   6. texto transbordando o container
//   7. botão sem rótulo acessível
//
// Tira um screenshot de cada aba em scripts/audit/ pra inspeção visual.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ABAS = ['hunt', 'rtc', 'tasks', 'training', 'bestiary', 'arena', 'bossrush',
  'battlepass', 'shop', 'market', 'skills', 'worlds', 'highscores', 'admin'];

mkdirSync('scripts/audit', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

const achados = [];
const add = (aba, tipo, msg) => achados.push({ aba, tipo, msg });

let abaAtual = 'boot';
page.on('pageerror', e => add(abaAtual, 'js', e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') add(abaAtual, 'console', m.text().slice(0, 180)); });
page.on('response', r => {
  if (r.status() === 404) add(abaAtual, '404', r.url().replace(/^https?:\/\/[^/]+\//, '').slice(0, 120));
});

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  const est = await instalarLiveImport(page);
  if (!est.voc) {
    await page.evaluate(async () => {
      const i = document.getElementById('char-name-input');
      if (i) { i.value = 'AuditAll'; i.dispatchEvent(new Event('input', { bubbles: true })); }
      await window.createCharacter('knight');
    });
    await page.waitForFunction(() => window.__G.vocation, null, { timeout: 25000 }).catch(() => {});
  }
  console.log('personagem:', await page.evaluate(() => window.__G.vocation), 'lv', await page.evaluate(() => window.__G.level));

  for (const aba of ABAS) {
    abaAtual = aba;
    const existe = await page.$(`.tab[data-tab="${aba}"]`);
    if (!existe) { add(aba, 'estrutura', 'aba não existe no DOM'); continue; }
    const visivel = await page.evaluate(t => {
      const b = document.querySelector(`.tab[data-tab="${t}"]`);
      return !!b && b.offsetParent !== null;
    }, aba);
    if (!visivel) { console.log(`  ${aba.padEnd(11)} (oculta — pulada)`); continue; }

    await page.evaluate(t => document.querySelector(`.tab[data-tab="${t}"]`).click(), aba);
    await page.waitForTimeout(1400);

    const r = await page.evaluate(async () => {
      const painel = document.querySelector('.tab-panel:not([style*="display: none"]), .panel:not([style*="display: none"])')
        || document.querySelector('main') || document.body;

      // imagens quebradas (já carregadas e com largura 0)
      const imgs = [...document.querySelectorAll('img')].filter(i => i.offsetParent !== null);
      const quebradas = imgs.filter(i => i.complete && i.naturalWidth === 0)
        .map(i => (i.getAttribute('src') || '').split('/').pop()).slice(0, 8);

      // chave de tradução crua: texto tipo "zone.foo" / "shop.bar" isolado
      const cruas = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.nodeValue.trim();
        if (/^[a-z][a-zA-Z]*\.[a-zA-Z][a-zA-Z0-9_.]*$/.test(t) && t.length < 60) {
          const el = n.parentElement;
          if (el && el.offsetParent !== null && cruas.length < 8) cruas.push(t);
        }
      }

      // Texto transbordando o próprio container.
      // Ignora quem tem filho POSICIONADO (absolute/fixed): um badge colado em
      // `right:-6px` — como o "!" do botão Diária — infla o scrollWidth do pai
      // de propósito. Sem esta exceção o detector acusava o mesmo botão em
      // todas as abas, e não era bug nenhum.
      const temFilhoSolto = e => [...e.querySelectorAll('*')]
        .some(f => ['absolute', 'fixed'].includes(getComputedStyle(f).position));
      const transbordo = [...document.querySelectorAll('button, .card, h1, h2, h3, h4, td, .zname, .tab')]
        .filter(e => e.offsetParent !== null && e.scrollWidth > e.clientWidth + 4 && e.clientWidth > 30)
        .filter(e => !temFilhoSolto(e))
        .map(e => `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''}: "${(e.textContent || '').trim().slice(0, 40)}"`)
        .slice(0, 6);

      // botões sem rótulo (só ícone, sem aria-label/title)
      const semRotulo = [...document.querySelectorAll('button')]
        .filter(b => b.offsetParent !== null && !(b.textContent || '').trim()
          && !b.getAttribute('aria-label') && !b.getAttribute('title'))
        .map(b => b.className || b.id || '(sem classe)').slice(0, 6);

      return {
        vazio: (painel.textContent || '').trim().length < 40,
        quebradas,
        cruas: [...new Set(cruas)],
        transbordo,
        semRotulo: [...new Set(semRotulo)],
        overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        largura: document.documentElement.scrollWidth,
      };
    });

    if (r.vazio) add(aba, 'vazio', 'painel praticamente sem conteúdo');
    r.quebradas.forEach(q => add(aba, 'img', `não carregou: ${q}`));
    r.cruas.forEach(c => add(aba, 'i18n', `chave crua na tela: ${c}`));
    r.transbordo.forEach(t => add(aba, 'layout', `texto transbordando — ${t}`));
    r.semRotulo.forEach(b => add(aba, 'a11y', `botão sem rótulo: ${b}`));
    if (r.overflowH) add(aba, 'layout', `rolagem horizontal (${r.largura}px > 1366px)`);

    await page.screenshot({ path: `scripts/audit/${aba}.png` }).catch(() => {});
    const n = achados.filter(a => a.aba === aba).length;
    console.log(`  ${aba.padEnd(11)} ${n ? n + ' achado(s)' : 'ok'}`);
  }
  // ---- MODAIS: abrir cada janela e conferir que renderiza e fecha ----
  abaAtual = 'modais';
  const MODAIS = [
    ['Configurações', 'openSettingsPanel'],
    ['Recompensa diária', 'openDailyReward'],
    ['Outfit', 'openOutfitPicker'],
    ['Imbuements', 'openImbueModal'],
    ['Conquistas', 'openAchievements'],
    ['Mochila', 'toggleBackpack'],
  ];
  for (const [nome, fn] of MODAIS) {
    const r = await page.evaluate(async f => {
      if (typeof window[f] !== 'function') return { erro: 'função global inexistente' };
      try { window[f](); } catch (e) { return { erro: 'lançou: ' + e.message.slice(0, 120) }; }
      await new Promise(r => setTimeout(r, 700));
      // NÃO usar offsetParent aqui: ele é null para elementos position:fixed —
      // que é justamente o caso de um overlay de modal. Com esse teste, todas
      // as janelas apareciam como "não abriu". Medir pela caixa renderizada.
      const visivel = e => {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const m = [...document.querySelectorAll('.modal-overlay, .modal, [id$="-overlay"]')].filter(visivel);
      if (!m.length) return { erro: 'não abriu nenhuma janela' };
      const alvo = m[m.length - 1];
      const texto = (alvo.textContent || '').trim();
      const imgsQuebradas = [...alvo.querySelectorAll('img')]
        .filter(i => i.complete && i.naturalWidth === 0).map(i => (i.getAttribute('src') || '').split('/').pop());
      return { conteudo: texto.length, imgsQuebradas: imgsQuebradas.slice(0, 5) };
    }, fn);
    if (r.erro) add('modal:' + nome, 'modal', r.erro);
    else {
      if (r.conteudo < 30) add('modal:' + nome, 'modal', `abriu quase vazio (${r.conteudo} caracteres)`);
      (r.imgsQuebradas || []).forEach(q => add('modal:' + nome, 'img', `não carregou: ${q}`));
      await page.screenshot({ path: `scripts/audit/modal-${fn}.png` }).catch(() => {});
    }
    await page.evaluate(() => { if (typeof window.closeModal === 'function') window.closeModal(); });
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }

  // ---- CELULAR: a largura mais apertada é onde o layout quebra ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  for (const aba of ABAS) {
    abaAtual = `celular:${aba}`;
    const ok = await page.evaluate(t => {
      const b = document.querySelector(`.tab[data-tab="${t}"]`);
      if (!b || b.offsetParent === null) return null;
      b.click();
      return true;
    }, aba);
    if (!ok) continue;
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      largura: document.documentElement.scrollWidth,
    }));
    if (r.overflow > 2) add(`celular:${aba}`, 'responsivo', `rolagem horizontal de ${r.overflow}px (conteúdo ${r.largura}px em tela de 390px)`);
  }
} catch (e) {
  add(abaAtual, 'exceção', e.message.slice(0, 200));
} finally {
  await browser.close();
}

console.log(`\n===== ${achados.length} ACHADOS =====`);
const porTipo = {};
achados.forEach(a => { (porTipo[a.tipo] = porTipo[a.tipo] || []).push(a); });
for (const [tipo, lista] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${tipo} (${lista.length})`);
  const vistos = new Set();
  lista.forEach(a => {
    const chave = a.tipo + a.msg;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    const abas = [...new Set(lista.filter(x => x.msg === a.msg).map(x => x.aba))];
    console.log(`  [${abas.join(',')}] ${a.msg}`);
  });
}
