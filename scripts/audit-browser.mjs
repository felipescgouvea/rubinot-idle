// Auditor de BROWSER — sobe o jogo real num Chromium headless com a conta de
// teste e roda cenários que só falham em RUNTIME (o que o Felipe reportava na
// mão). Cenários:
//   1. Básico: login + criar personagem + caçar → console/exceção/network + o
//      combate roda e hp/mana ficam sãos.
//   2. Magia: configura magia de ataque no RTC → confirma que casta (log de
//      magia + efeito no palco) e consome mana.
//   3. Mana idle→play: para a caçada, fica ocioso (cliente regenera), dá play →
//      a mana NÃO pode cair (regressão que o fix do servidor resolveu).
// Uso: node scripts/audit-browser.mjs   (exit 1 se achar problema)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const SITE = acct.site;
const log = (...a) => console.log('[audit]', ...a);
const problems = [];

const consoleErrors = new Map(), pageErrors = new Map(), failedReq = new Map();
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
let tearingDown = false;
let idleReqLog = null; // quando array, captura requests do jogo (diagnóstico do reset ocioso)
const t0 = Date.now();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
// só o que é DO JOGO (site + servidor de caçada + supabase) — CDN de terceiros
// (fontes do google, etc.) pode piscar e não é bug nosso.
const ours = u => /felipescgouvea\.github\.io|up\.railway\.app|supabase\.co/.test(u);
page.on('console', m => { if (tearingDown || m.type() !== 'error') return; const t = m.text(); if (/Failed to load resource/.test(t)) return; bump(consoleErrors, t.slice(0, 300)); });
page.on('pageerror', e => { if (!tearingDown) bump(pageErrors, (e.message || String(e)).slice(0, 300)); });
page.on('response', r => { if (tearingDown) return; const s = r.status(); if (s >= 400 && ours(r.url())) bump(failedReq, `${s} ${r.request().method()} ${r.url().replace(/\?.*$/, '')}`); });
page.on('requestfailed', r => { if (tearingDown || !ours(r.url())) return; const f = r.failure(); if (f && /ERR_ABORTED/.test(f.errorText)) return; bump(failedReq, `FAIL ${r.method()} ${r.url().replace(/\?.*$/, '')} (${f ? f.errorText : '?'})`); });
page.on('request', r => { if (idleReqLog && ours(r.url())) idleReqLog.push(`+${((Date.now() - t0) / 1000).toFixed(1)}s ${r.method()} ${r.url().split('?')[0].split('/').slice(-2).join('/')}`); });

// lê a mana/hp exibida como [atual, max]. Usa o #mana-text/#hp-text do char-info
// (barra SEMPRE viva, atualizada por BARS/HEADER_STATS) — o #player-mana-label
// do modal de batalha fica STALE quando a caçada está parada, o que enganava a
// leitura durante o teste de ocioso.
const readVitals = () => page.evaluate(() => {
  const parse = t => { const n = (t || '').match(/\d+/g); return n ? n.map(Number) : []; };
  return {
    mana: parse(document.getElementById('mana-text')?.textContent || document.getElementById('player-mana-label')?.textContent),
    hp: parse(document.getElementById('hp-text')?.textContent || document.getElementById('player-hp-label')?.textContent),
    logText: (document.getElementById('combat-log')?.innerText || '').slice(-4000),
    logLines: document.getElementById('combat-log')?.children.length || 0,
    fxSeen: window.__fxSeen || 0,
    sawSpell: window.__sawSpellCast || false,
  };
});

try {
  log('abrindo', SITE);
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  log('login enviado; aguardando boot...');
  await page.waitForFunction(() => { const g = document.getElementById('auth-gate'); return !g || g.style.display === 'none' || g.offsetParent === null; }, { timeout: 45000 }).catch(() => {});
  // dá um tempo curto pro char aparecer — com o fix ele mostra rápido; sem o
  // fix, fica ~5s na tela de "criar personagem" (char bloqueado atrás das idas
  // ao servidor do resume). Checa dentro dessa janela.
  await page.waitForTimeout(2000);

  // hook: conta efeitos de combate (projétil/área) criados no palco
  await page.evaluate(() => {
    window.__fxSeen = 0;
    const stage = document.getElementById('dungeon-stage') || document.body;
    new MutationObserver(muts => { for (const mu of muts) for (const n of mu.addedNodes) { if (n.nodeType === 1 && (n.className || '').toString().match(/projectile|area|effect|fx|splash/i)) window.__fxSeen++; } })
      .observe(stage, { childList: true, subtree: true });
    // hook: marca "magia castada" no MOMENTO que a linha 🗣️ entra no DOM — robusto
    // contra a janela curta do logText (o log cresce e empurra o cast pra fora) E
    // contra o re-render do #combat-log (observa o body, que não é recriado).
    window.__sawSpellCast = false;
    new MutationObserver(muts => { for (const mu of muts) for (const n of mu.addedNodes) { if (n.nodeType === 1 && /🗣️/.test(n.textContent || '')) window.__sawSpellCast = true; } }).observe(document.body, { childList: true, subtree: true });
  });

  // diagnóstico: o char DEVERIA carregar do cloud save no boot (main.js). Se a
  // tela de criação aparece com char salvo no banco, é bug de load.
  const boot = await page.evaluate(() => {
    let ls = null;
    try { const raw = localStorage.getItem('rubinot_idle_v1'); const p = raw && JSON.parse(raw); ls = p ? { hasSlots: !!p.slots, voc0: p.slots ? (p.slots[0] && p.slots[0].vocation) : (p.vocation || null) } : 'vazio'; } catch (e) { ls = 'erro:' + e.message; }
    return {
      nameInputVisible: !!(document.getElementById('char-name-input')?.offsetParent),
      charInfoVisible: !!(document.getElementById('char-info')?.offsetParent),
      localStorageSave: ls,
    };
  });
  log('estado pós-boot:', JSON.stringify(boot));
  // Bug do 1º login (dispositivo novo): se o localStorage TEM o char mas a UI
  // ainda mostra "criar personagem" depois da janela, o render do char está
  // travado atrás das idas ao servidor do resume (ver main.js: render antes do
  // await). Flaga e recarrega pra o resto do teste seguir.
  if (boot.nameInputVisible && boot.localStorageSave && boot.localStorageSave.voc0) {
    problems.push('RENDER: char demora a aparecer no 1º login — localStorage tem o char mas a UI segue em "criar personagem" (bloqueado atrás do resume/servidor); jogador em dispositivo novo acha que perdeu o char');
    log('DIVERGE: char não apareceu na janela — recarregando pra prosseguir...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
  }
  const needChar = await page.isVisible('#char-name-input').catch(() => false);
  if (needChar) {
    await page.fill('#char-name-input', 'ClaudeAuditBot');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    log('personagem druida criado; aguardando kit...');
    await page.waitForTimeout(7000);
  } else { log('personagem já existe; seguindo.'); }

  // configura magia de ataque de nível 1 COMPATÍVEL com a vocação real do
  // personagem (a conta de teste pode ser sorc OU druid). mud_attack é druid-only:
  // num sorcerer, setRtcAttackSpellSlot ignora silenciosamente (isSpellAvailable
  // falha) e a magia nunca casta — o que dava um falso "spell não logou". buzz
  // (sorc) e mud_attack (druid) compartilham as words-chave que o probe procura.
  const atk = await page.evaluate(async () => {
    let voc = null, existing = [];
    try { const p = JSON.parse(localStorage.getItem('rubinot_idle_v1')); const g = (p && p.slots && p.slots[p.activeSlot || 0]) || p; voc = g && g.vocation; existing = ((g && g.rtc && g.rtc.attackSpells) || []).filter(Boolean); } catch (e) {}
    // Se a conta já tem magia de ataque configurada, PRESERVA (sobrescrever com uma
    // magia de nível 1 podia trocar por uma que o sorc de nível alto nem casta).
    // Só configura uma compatível quando não há nenhuma.
    let id, kept;
    if (existing.length) { id = existing[0]; kept = true; }
    else { id = voc === 'druid' ? 'mud_attack' : 'buzz'; if (window.setRtcAttackSpellSlot) window.setRtcAttackSpellSlot(0, id, 'spell'); kept = false; }
    // Custo de mana da magia — pra o C2 saber se o jogador PODIA castar. Uma magia
    // cara (ex.: Divine Caldera, 160) com mana baixa após caçar simplesmente não
    // casta; sem isso o probe acusava "magia não logou" que era só falta de mana.
    let manaCost = 0;
    try {
      const base = new URL('.', location.href).href;
      const mainSrc = await (await fetch(base + 'src/main.js?p=' + Date.now())).text();
      const sV = (mainSrc.match(/spells\.js\?v=(\d+)/) || [])[1];
      const sp = await import(base + 'src/domain/spells.js?v=' + sV);
      manaCost = (sp.SPELLS && sp.SPELLS[id] && sp.SPELLS[id].mana) || 0;
    } catch (e) {}
    return { voc, id, kept, manaCost };
  });
  log(`RTC magia de ataque: ${atk.id} (voc ${atk.voc}, ${atk.kept ? 'preexistente' : 'configurada'})`);
  await page.waitForTimeout(500);

  // --- Cenário 1+2: caçar com magia ---
  await page.evaluate(() => window.pickZone && window.pickZone('troll_cave'));
  log('caçando com magia configurada (32s)...');
  const samples = [];
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(4000); samples.push(await readVitals()); }
  const last = samples[samples.length - 1];
  const combatRan = last.logLines > 3;
  const manaSane = samples.every(s => s.mana.length < 2 || (s.mana[0] >= 0 && s.mana[0] <= s.mana[1]));
  // O log de cast SEMPRE traz o emoji 🗣️ + as palavras (huntUseCases: renderCombatEvents).
  // As palavras variam por magia (exori, exevo, infir, conjura...), então o emoji é o
  // sinal confiável — antes o regex só cobria "exori" e dava falso-negativo pra "exevo".
  // O observer (window.__sawSpellCast) é a fonte confiável — pega o cast no momento,
  // sem depender da janela curta do logText. O regex fica como reforço.
  const spellLogged = samples.some(s => s.sawSpell) || /🗣️|exevo|exori|infir|conjur/i.test(samples.map(s => s.logText).join(' '));
  const manaMovedDown = samples.some(s => s.mana.length === 2 && s.mana[0] < s.mana[1]); // dipou abaixo do teto = castou
  const fxSeen = last.fxSeen;
  // Só é bug se o jogador TINHA mana pra castar e mesmo assim não castou — uma magia
  // cara com mana baixa após caçar não casta por design, não por defeito. Exige mana
  // suficiente em ao menos 2 amostras: um pico único (mana oscilando no limite do
  // custo, ex.: Divine Caldera 160) não garante um tick com mana pra castar, e antes
  // dava C2 falso quando a magia só castava raramente/nunca.
  const manaCost = atk.manaCost || 0;
  const couldCast = manaCost === 0 || samples.filter(s => s.mana.length === 2 && s.mana[0] >= manaCost).length >= 2;
  log(`combate=${combatRan} manaSane=${manaSane} spellLog=${spellLogged} manaDip=${manaMovedDown} fx=${fxSeen} custoMana=${manaCost} pôdeCastar=${couldCast}`);
  if (!combatRan) problems.push('C1: combate não rodou (log vazio)');
  if (!manaSane) problems.push('C1: mana fora de [0,max]');
  if (!spellLogged && couldCast) problems.push('C2: magia não apareceu no log (RTC não castou?)');
  else if (!spellLogged) log(`C2 pulado: mana nunca atingiu o custo de ${atk.id} (${manaCost}) — não dava pra castar, não é bug`);
  if (!manaMovedDown && !spellLogged && couldCast) problems.push('C2: mana nunca dipou nem magia logou — magia não está sendo usada');
  if (fxSeen === 0) problems.push('C2: nenhum efeito de combate renderizado no palco (fx=0)');

  // --- Cenário 2b: Estilo de Luta (Fight Mode) — os 3 modos aplicam sem erro e
  // destacam o botão ativo na janela de batalha ---
  // NB: os botões de densidade reusam a classe .fight-mode-btn (só p/ estilo),
  // então contar .fight-mode-btn solto dá 6 — escopa no #fight-mode-row.
  const hasBtns = await page.evaluate(() => document.querySelectorAll('#fight-mode-row .fight-mode-btn').length === 3);
  if (!hasBtns) problems.push('FIGHTMODE: os 3 botões de estilo de luta não estão na janela de batalha');
  else for (const mode of ['defense', 'attack', 'balanced']) {
    await page.evaluate(m => window.setFightMode && window.setFightMode(m), mode);
    await page.waitForTimeout(1200);
    const active = await page.evaluate(() => document.querySelector('#fight-mode-row .fight-mode-btn.active')?.dataset.mode);
    if (active !== mode) problems.push(`FIGHTMODE: '${mode}' não ficou ativo na UI (ativo=${active})`);
  }
  log('estilo de luta: botões + 3 modos testados');

  // --- Cenário 2c: Densidade da caçada — os 3 botões aplicam sem erro ---
  const hasDensity = await page.evaluate(() => document.querySelectorAll('#density-row .density-btn').length === 3);
  if (!hasDensity) problems.push('DENSITY: os 3 botões de densidade não estão na janela de batalha');
  else for (const mode of ['solo', 'pack', 'normal']) {
    await page.evaluate(m => window.setDensity && window.setDensity(m), mode);
    await page.waitForTimeout(1200);
    const active = await page.evaluate(() => document.querySelector('#density-row .density-btn.active')?.dataset.mode);
    if (active !== mode) problems.push(`DENSITY: '${mode}' não ficou ativo na UI (ativo=${active})`);
  }
  log('densidade: botões + 3 modos testados');

  // --- Cenário 3: regen ocioso + sem drop de mana ao dar play ---
  // continua caçando até haver DÉFICIT real (senão o regen não tem o que
  // recuperar e o teste fica inconclusivo/flaky) — depois para NA HORA.
  let vPre = await readVitals();
  for (let i = 0; i < 18 && !((vPre.hp[1] && vPre.hp[0] < vPre.hp[1] * 0.85) || (vPre.mana[1] && vPre.mana[0] < vPre.mana[1] * 0.85)); i++) {
    await page.waitForTimeout(2000); vPre = await readVitals();
  }
  await page.evaluate(() => window.toggleHunt && window.toggleHunt()); // para NA HORA (com déficit)
  await page.waitForTimeout(600);
  const vStop = await readVitals();
  const hpDef = vStop.hp.length === 2 && vStop.hp[0] < vStop.hp[1] * 0.92;
  const manaDef = vStop.mana.length === 2 && vStop.mana[0] < vStop.mana[1] * 0.92;
  if (hpDef || manaDef) {
    log(`ao parar hp=${vStop.hp.join('/')} mana=${vStop.mana.join('/')} — ocioso 24s, amostrando regen...`);
    idleReqLog = []; // captura requests do jogo durante o ocioso pra achar o culpado do reset
    const manaTraj = [vStop.mana[0]], hpTraj = [vStop.hp[0]];
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(4000); const v = await readVitals(); manaTraj.push(v.mana[0]); hpTraj.push(v.hp[0]); }
    log('trajetória mana:', manaTraj.join(' → '), '| hp:', hpTraj.join(' → '));
    log('requests do jogo no ocioso:', idleReqLog.length ? idleReqLog.join('  |  ') : '(nenhuma)');
    idleReqLog = null;
    const vIdle = await readVitals();
    // regen ocioso deveria ser MONOTÔNICO pra cima. Uma QUEDA entre amostras
    // consecutivas parado = o sync periódico resetou pro valor velho do servidor
    // (oscilação — a mana/hp "pula pra baixo sozinha"). Tolerância pequena.
    const maxDrop = (arr, max) => { let worst = 0; for (let i = 1; i < arr.length; i++) worst = Math.max(worst, arr[i - 1] - arr[i]); return worst; };
    const manaDrop = maxDrop(manaTraj), hpDrop = maxDrop(hpTraj);
    // regen ocioso é monotônico pra cima — qualquer queda > ~3% do teto (ou 8
    // pontos) entre amostras parado é o reset periódico pro valor do servidor.
    if (manaDrop > Math.max(8, Math.round(vStop.mana[1] * 0.03))) problems.push(`REGEN: mana OSCILA parado (regenera e reseta -${manaDrop}) — sync periódico volta pro valor velho do servidor`);
    if (hpDrop > Math.max(8, Math.round(vStop.hp[1] * 0.03))) problems.push(`REGEN: hp OSCILA parado (regenera e reseta -${hpDrop})`);
    // play de novo: mana não pode CAIR (fix do servidor)
    await page.evaluate(() => window.toggleHunt && window.toggleHunt());
    let vPlayMaxMana = 0;
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(400); const v = await readVitals(); if ((v.mana[0] || 0) > vPlayMaxMana) vPlayMaxMana = v.mana[0]; }
    const tol = Math.round((vIdle.mana[1] || 300) * 0.15);
    log(`ao dar play: mana idle=${vIdle.mana[0]} -> play=${vPlayMaxMana} (tol ${tol})`);
    if (vIdle.mana[0] && vPlayMaxMana < vIdle.mana[0] - tol) problems.push(`C3: MANA CAIU ao dar play (${vIdle.mana[0]} -> ${vPlayMaxMana}) — bug do drop voltou`);
  } else {
    log(`C3 inconclusivo: sem déficit de hp nem mana ao parar (hp ${vStop.hp.join('/')}, mana ${vStop.mana.join('/')})`);
  }
} catch (e) {
  problems.push('fluxo quebrou: ' + e.message);
  log('ERRO:', e.message);
} finally {
  tearingDown = true;
  try { await page.evaluate(() => { if (window.__hunting !== false) window.toggleHunt && window.toggleHunt(); }); } catch {}
  // dispara o flush do cloud save (o jogo faz isso no pagehide, ver main.js) pra
  // o personagem/progresso persistir de verdade — senão o char some entre
  // rodadas (o save é debounced 8s e browser.close() não dispara o pagehide).
  try { await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); } catch {}
  await page.waitForTimeout(4000).catch(() => {});
  await browser.close();
}

console.log('\n=== AUDITORIA DE BROWSER ===');
const dump = (title, m) => { if (!m.size) return; console.log(`\n### ${title} (${m.size})`); [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, c]) => console.log(`  - [${c}x] ${k}`)); for (const k of m.keys()) problems.push(`${title}: ${k}`); };
dump('Exceções JS', pageErrors);
dump('Erros de console', consoleErrors);
dump('Requests falhos', failedReq);
if (problems.length) { console.log('\n❌ PROBLEMAS:'); problems.forEach(p => console.log('  - ' + p)); }
else console.log('\n✅ nenhum problema de runtime detectado (3 cenários)');
process.exit(problems.length ? 1 : 0);
