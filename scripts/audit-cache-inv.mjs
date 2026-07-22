// Valida o CACHE DE INVENTÁRIO da sessão (server/src/huntEngine.js).
//
// O tick deixou de ler player_inventory e passou a confiar num espelho em
// memória. O risco dessa troca é a memória e o banco DIVERGIREM — e divergir
// aqui significa loot que o jogador vê e não tem, ou poção que ele tem e o RTC
// acha que acabou.
//
// Duas provas:
//   1. caçando, o loot creditado aparece no inventário (o write-through vale)
//   2. o que o servidor devolve no /hunt/state bate com o que o cliente mostra
//      — o /hunt/state lê o BANCO, então bater com ele prova que memória e
//      banco não se separaram
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'rat_cave';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const falhas = [], ok = [];

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  const r = await page.evaluate(async z => {
    const hu = await window.__liveImport('huntUseCases.js');
    const au = await window.__liveImport('authClient.js');
    const antes = { ...window.__G.inventory };
    hu.selectZone(z);
    await new Promise(x => setTimeout(x, 800));
    await hu.startHunt();
    await new Promise(x => setTimeout(x, 70000));
    const depois = { ...window.__G.inventory };
    // ORDEM IMPORTA. Com a caçada VIVA, o /hunt/state passou a responder da
    // memória da sessão — comparar com ele nesse momento é circular: memória
    // batendo com ela mesma. É preciso PARAR a caçada primeiro; sem sessão
    // viva a rota volta a ler player_inventory, e aí a comparação vale.
    if (window.__G.hunting) window.toggleHunt();
    await new Promise(x => setTimeout(x, 4000));
    const estado = await au.getHuntState(window.__ACC.activeSlot);
    return { antes, depois, doBanco: (estado && estado.inventory) || {}, kills: window.__G.totalKills };
  }, ZONA);

  const ganhou = Object.keys(r.depois).filter(k => (r.depois[k] || 0) > (r.antes[k] || 0));
  console.log(`caçada de 70s · itens que aumentaram: ${ganhou.length ? ganhou.join(', ') : 'nenhum'}`);
  if (!ganhou.length) console.log('loot: INCONCLUSIVO — nada foi lootado na janela medida');
  else ok.push('loot creditado pelo cache');

  // divergência memória (cliente, alimentado pelo motor) x banco
  const chaves = new Set([...Object.keys(r.depois), ...Object.keys(r.doBanco)]);
  const diverge = [...chaves].filter(k => (r.depois[k] || 0) !== (r.doBanco[k] || 0));
  console.log(`comparação com o banco: ${chaves.size} itens conferidos · divergentes: ${diverge.length}`);
  if (diverge.length) {
    diverge.slice(0, 6).forEach(k => console.log(`   ${k}: cliente ${r.depois[k] || 0} · banco ${r.doBanco[k] || 0}`));
    falhas.push(`memória e banco divergiram em ${diverge.length} item(ns) — o cache do tick se separou da verdade`);
  } else ok.push('memória e banco em acordo');
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message.slice(0, 200));
} finally {
  await page.evaluate(() => { if (window.__G && window.__G.hunting) window.toggleHunt(); }).catch(() => {});
  console.log(`\nverificados: ${ok.join(', ') || 'nenhum'}`);
  if (!falhas.length && !ok.length) console.log('\nRESULTADO: INCONCLUSIVO — nada foi exercitado');
  else console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
