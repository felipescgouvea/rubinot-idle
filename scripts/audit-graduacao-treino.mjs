// AUDITORIA: RTC reseta na troca de vocação + treino neutro em Rook.
//
// Dois bugs do Felipe (graduando sorcerer->paladin em combate):
//  1. o RTC seguia com as magias de sorcerer armadas depois de virar paladin;
//  2. Magic Level treinava rápido demais em Rook (vocação provisória), então
//     dava pra farmar ML como sorcerer e graduar paladin levando o ML de brinde.
//
// Este probe NÃO mexe no personagem real do Felipe — usa a conta de teste e um
// slot próprio, e mede as duas coisas pela lógica de domínio já carregada na
// página (mesma versão que o jogo roda).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], ok = [], inconclusivos = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);

  // ---- 1. RTC reseta na troca de vocação ----------------------------------
  // Exercita pruneRtcForVocation direto: arma magia de sorcerer num G fingido de
  // paladino e confirma que ela é removida. É a função que graduate() chama.
  const prune = await page.evaluate(async () => {
    const rtc = await window.__liveImport('rtcUseCases.js');
    const gs = await window.__liveImport('gameStore.js');
    const G = gs.G;
    const vocSalva = G.vocation, rtcSalvo = JSON.parse(JSON.stringify(G.rtc));
    // cenário: paladino com magia de sorcerer (fire wave) e exori (knight) armadas
    G.vocation = 'paladin';
    G.rtc.attackSpells = ['exevo_flam_hur', 'exevo_gran_flam_hur', 'exori_con', null];
    const caiu = rtc.pruneRtcForVocation();
    const sobrou = G.rtc.attackSpells.filter(Boolean);
    // restaura pra não sujar o save
    G.vocation = vocSalva; G.rtc = rtcSalvo;
    return { caiu, sobrou };
  });
  console.log('prune RTC:', JSON.stringify(prune));
  const sorcSobrou = prune.sobrou.some(id => id === 'exevo_flam_hur' || id === 'exevo_gran_flam_hur');
  if (sorcSobrou) problemas.push('magia de sorcerer sobreviveu no RTC de um paladino — o reset não filtrou');
  else if (!prune.sobrou.includes('exori_con')) problemas.push('o prune tirou até a magia VÁLIDA do paladino (exori_con) — filtrou demais');
  else ok.push(`RTC podado na troca de vocação: caíram ${prune.caiu}, sobrou a magia válida do paladino (exori_con)`);

  // ---- 2. treino de ML em Rook (provisório) é o mais lento ----------------
  const treino = await page.evaluate(async () => {
    const ch = await window.__liveImport('character.js');
    // tentativas pra subir ML num nível baixo, comparando committed x provisório
    const lv = 4;
    return {
      sorcererCommitted: ch.triesForNext('sorcerer', 'magic', lv),
      paladinCommitted: ch.triesForNext('paladin', 'magic', lv),
      knightCommitted: ch.triesForNext('knight', 'magic', lv),
      provisorio: ch.triesForNext('sorcerer', 'magic', lv, true),
    };
  });
  console.log('treino ML (lv4→5):', JSON.stringify(treino));
  if (treino.provisorio <= treino.sorcererCommitted) {
    problemas.push(`ML provisório (${treino.provisorio}) não é mais lento que o sorcerer committed (${treino.sorcererCommitted}) — o farm em Rook continua valendo`);
  } else if (treino.provisorio < treino.knightCommitted) {
    problemas.push(`ML provisório (${treino.provisorio}) mais rápido que o ritmo neutro/knight (${treino.knightCommitted})`);
  } else {
    const fator = (treino.provisorio / treino.sorcererCommitted).toFixed(0);
    ok.push(`ML em Rook é o ritmo neutro: ${fator}x mais caro que o sorcerer committed (${treino.provisorio} vs ${treino.sorcererCommitted} tentativas)`);
  }

  // contraprova: depois de graduar (committed), o sorcerer volta a ser rápido
  if (treino.sorcererCommitted < treino.paladinCommitted) ok.push('committed: sorcerer treina ML mais rápido que paladin, como deve (vantagem só após graduar)');
  else problemas.push('committed: sorcerer não treina ML mais rápido que paladin — a fórmula base regrediu');

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(64));
console.log('AUDITORIA — RESET DE RTC + TREINO NEUTRO EM ROOK');
console.log('='.repeat(64));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) { console.log(`\nRESULTADO: FALHOU — ${problemas.length}`); problemas.forEach(p => console.log('  ✗ ' + p)); process.exitCode = 1; }
else console.log('\nRESULTADO: PASSOU');
