// Fumaça depois de mexer em permissões do banco: Mercado e Highscores ainda
// respondem? Ambos passam pelo servidor (service role), então NÃO deveriam ser
// afetados por RLS — este probe é a prova disso, não uma suposição.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const falhas = [];
p.on('pageerror', e => falhas.push('PAGEERR ' + e.message.slice(0, 150)));
try {
  await p.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(p, acct);
  await instalarLiveImport(p);
  const r = await p.evaluate(async () => {
    const ac = await window.__liveImport('authClient.js');
    const slot = window.__ACC.activeSlot;
    const out = {};
    // Nomes REAIS dos helpers — a versão anterior chamava nomes inventados e
    // todas as checagens caíam em "sem helper", passando sem testar nada.
    const chamar = async (nome, fn) => {
      if (typeof fn !== 'function') { out[nome] = 'HELPER INEXISTENTE'; return; }
      try { const r = await fn(); out[nome] = r && r.ok === false ? ('recusado: ' + r.error) : 'ok'; }
      catch (e) { out[nome] = 'ERRO ' + e.message; }
    };
    await chamar('marketStats', ac.fetchMarketStatsOnServer && (() => ac.fetchMarketStatsOnServer(slot, 'meat')));
    await chamar('marketListings', ac.fetchMarketListingsOnServer && (() => ac.fetchMarketListingsOnServer(slot)));
    await chamar('marketWallet', ac.fetchMarketWallet && (() => ac.fetchMarketWallet(slot)));
    await chamar('highscores', ac.fetchHighscoresOnServer && (() => ac.fetchHighscoresOnServer('level')));
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  Object.entries(r).forEach(([k, v]) => { if (String(v) !== 'ok') falhas.push(`${k}: ${v}`); });
  // e o mais importante: a caçada continua creditando?
  await p.evaluate(async () => {
    if (window.__G.hunting) window.toggleHunt();
    await new Promise(r => setTimeout(r, 1200));
    window.__H.selectZone('rat_cave');
    await new Promise(r => setTimeout(r, 800));
    await window.__H.startHunt();
  });
  const vivo = await p.waitForFunction(() => (window.__H.getCurrentPack() || []).length > 0, null, { timeout: 40000 }).then(() => true).catch(() => false);
  console.log('caçada spawnou:', vivo);
  if (!vivo) falhas.push('a caçada não spawnou depois das mudanças de permissão');
  await p.evaluate(() => window.__G.hunting && window.toggleHunt());
  await p.waitForTimeout(1200);
} catch (e) { falhas.push('EXCEÇÃO ' + e.message); }
finally {
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await b.close();
}
