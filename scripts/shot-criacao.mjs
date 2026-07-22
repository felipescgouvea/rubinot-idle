// Print da tela de criação usando o SLOT 2 vazio — caminho legítimo, sem forjar
// estado no cliente (mexer em G.vocation na mão arriscaria o autosave gravar um
// personagem quebrado por cima do save real).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
const erros = [];
p.on('pageerror', e => erros.push(e.message.slice(0, 200)));
await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
await login(p, acct);
await instalarLiveImport(p);
const slots = await p.evaluate(() => ({ ativo: window.__ACC.activeSlot, vazios: window.__ACC.slots.map(s => !s || !s.vocation) }));
console.log('slots:', JSON.stringify(slots));
const alvo = slots.vazios.findIndex(Boolean);
if (alvo < 0) { console.log('INCONCLUSIVO: nenhum slot vazio pra exercitar a criação'); await b.close(); process.exit(2); }
await p.evaluate(async s => { const a = await window.__liveImport('accountUseCases.js'); a.switchCharacterSlot(s); }, alvo);
await esperarReload(p);
await p.waitForTimeout(2500);
const estado = await p.evaluate(() => {
  const ov = document.getElementById('char-create-overlay');
  const cs = ov && getComputedStyle(ov);
  return {
    visivel: !!ov && ov.style.display === 'flex',
    desfoque: cs ? (cs.backdropFilter || cs.webkitBackdropFilter) : null,
    fundo: cs ? cs.backgroundColor : null,
    focoNoNome: document.activeElement?.id,
    titulo: document.querySelector('.char-create-header h3')?.textContent?.trim(),
    dicaTransborda: (() => {
      const h = document.getElementById('starter-set-hint'), box = document.getElementById('char-create-box');
      if (!h || !box) return null;
      const a = h.getBoundingClientRect(), b2 = box.getBoundingClientRect();
      return a.right > b2.right + 1 || a.left < b2.left - 1;
    })(),
    sets: [...document.querySelectorAll('.voc-btn .voc-name')].map(e => e.textContent.trim()),
  };
});
console.log(JSON.stringify(estado, null, 1));
await p.screenshot({ path: 'scripts/shot-criacao.png' });
if (erros.length) console.log('ERROS:', erros);
await b.close();
