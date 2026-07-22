// Mede o efeito do canal de tempo real durante a caçada:
//   1. o socket conecta e ENTREGA (mensagens chegando)?
//   2. o volume de requisições HTTP caiu?
//   3. o combate continua andando (o push não substituiu estado por nada)?
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const ZONA = process.argv[2] || 'rat_cave';
const SEG = Number(process.argv[3] || 45);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// conta quadros de WebSocket recebidos
let frames = 0, socketAberto = null;
page.on('websocket', ws => {
  socketAberto = ws.url();
  ws.on('framereceived', () => { frames++; });
});

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);
  await page.evaluate(() => { if (window.__G.hunting) window.toggleHunt(); });
  await page.waitForTimeout(1500);

  // ARMADILHA: clearResourceTimings() apaga justamente as entradas que o
  // __liveImport usa pra descobrir a URL versionada de cada módulo — limpar
  // aqui deixava o probe sem conseguir importar nada. Em vez de limpar,
  // guardamos uma linha de base e contamos a diferença.
  const r = await page.evaluate(async (args) => {
    const hu = await window.__liveImport('huntUseCases.js');
    const rt = await window.__liveImport('realtimeClient.js');
    const base = performance.getEntriesByType('resource').filter(e => e.name.includes('/hunt/state')).length;
    window.__T0 = performance.now();
    hu.selectZone(args.z);
    await new Promise(x => setTimeout(x, 800));
    await hu.startHunt();
    const xp0 = window.__G.xp, kills0 = window.__G.totalKills;
    await new Promise(x => setTimeout(x, args.seg * 1000));
    const out = {
      dur: (performance.now() - window.__T0) / 1000,
      polls: performance.getEntriesByType('resource').filter(e => e.name.includes('/hunt/state')).length - base,
      socketVivo: rt.realtimeAtivo(),
      xpGanho: window.__G.xp - xp0,
      kills: window.__G.totalKills - kills0,
      pack: (hu.getCurrentPack() || []).length,
    };
    if (window.__G.hunting) window.toggleHunt();
    return out;
  }, { z: ZONA, seg: SEG });

  console.log(`socket: ${socketAberto ? 'conectado' : 'NÃO conectou'} · vivo ao fim: ${r.socketVivo}`);
  console.log(`quadros recebidos: ${frames} em ${r.dur.toFixed(0)}s = ${(frames / r.dur).toFixed(2)}/s (o tick é a cada 2s -> ~0,5/s)`);
  console.log(`polls /hunt/state: ${r.polls} = ${(r.polls / r.dur).toFixed(2)}/s`);
  console.log(`combate: ${r.kills} mortes, ${r.xpGanho} XP, ${r.pack} na sala ao fim`);

  const falhas = [];
  if (!socketAberto) falhas.push('o cliente não abriu o WebSocket');
  else if (frames < 3) falhas.push(`o socket conectou mas quase não entregou (${frames} quadros em ${r.dur.toFixed(0)}s)`);
  if (r.polls / r.dur > 0.5) falhas.push(`o poll não afrouxou: ${(r.polls / r.dur).toFixed(2)}/s (esperado ~0,2/s com socket vivo)`);
  if (!r.kills) console.log('combate: INCONCLUSIVO — nenhuma morte na janela medida');
  else if (!r.xpGanho) falhas.push('houve morte mas ZERO XP — o push pode ter sobrescrito o estado');
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
} catch (e) {
  console.log('EXCEÇÃO', e.message.slice(0, 250));
} finally {
  await page.evaluate(() => { if (window.__G && window.__G.hunting) window.toggleHunt(); }).catch(() => {});
  await browser.close();
}
