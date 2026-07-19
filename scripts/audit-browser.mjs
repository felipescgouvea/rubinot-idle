// Auditor de BROWSER — carrega o jogo REAL num Chromium headless, loga com a
// conta de teste, cria personagem, caça ~30s e captura a classe de bug que só
// aparece em runtime: erros de console, exceções JS, requests falhos (4xx/5xx,
// sprites 404), e se o combate de fato roda. É o que pega sozinho os bugs de
// mana/sincronia/console sem o Felipe precisar reportar.
// Uso: node scripts/audit-browser.mjs   (exit 1 se achar problema)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const SITE = acct.site;
const log = (...a) => console.log('[audit]', ...a);

const consoleErrors = new Map();   // msg -> count
const pageErrors = new Map();
const failedReq = new Map();
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

let tearingDown = false; // ignora aborts causados pelo próprio fechamento do browser
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => { if (!tearingDown && msg.type() === 'error') bump(consoleErrors, msg.text().slice(0, 300)); });
page.on('pageerror', err => { if (!tearingDown) bump(pageErrors, (err.message || String(err)).slice(0, 300)); });
page.on('response', r => { if (tearingDown) return; const s = r.status(); if (s >= 400) bump(failedReq, `${s} ${r.request().method()} ${r.url().replace(/\?.*$/, '')}`); });
page.on('requestfailed', r => {
  if (tearingDown) return;
  const f = r.failure();
  // ERR_ABORTED = request cancelado pelo cliente (navegação/fechamento), não é
  // erro do servidor/jogo — só conta se NÃO for abort.
  if (f && /ERR_ABORTED/.test(f.errorText)) return;
  bump(failedReq, `FAIL ${r.method()} ${r.url().replace(/\?.*$/, '')} (${f ? f.errorText : '?'})`);
});

let flowError = null;
const hpMana = [];
try {
  log('abrindo', SITE);
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  log('login enviado; aguardando boot do jogo...');
  await page.waitForFunction(() => {
    const g = document.getElementById('auth-gate');
    return !g || g.style.display === 'none' || g.offsetParent === null;
  }, { timeout: 45000 }).catch(() => log('aviso: gate de login não sumiu no tempo'));
  await page.waitForTimeout(4000);

  // cria personagem se ainda não existe (conta nova) — #char-name-input só
  // aparece antes de escolher vocação.
  const needChar = await page.$('#char-name-input');
  if (needChar) {
    await page.fill('#char-name-input', 'ClaudeAuditBot');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    log('personagem criado (druid); aguardando kit inicial...');
    await page.waitForTimeout(7000);
  } else {
    log('personagem já existe nesta conta; seguindo.');
  }

  // inicia a caçada em Rookgaard (pickZone já dá startHunt + abre a batalha)
  await page.evaluate(() => window.pickZone && window.pickZone('troll_cave'));
  log('caçada iniciada (troll_cave); observando 32s...');
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(4000);
    const snap = await page.evaluate(() => ({
      hp: document.getElementById('player-hp-label')?.textContent || document.getElementById('hp-text')?.textContent || '',
      mana: document.getElementById('player-mana-label')?.textContent || document.getElementById('mana-text')?.textContent || '',
      logLines: document.getElementById('combat-log')?.children.length || 0,
      hunting: (document.getElementById('hunt-toggle')?.textContent || '').toLowerCase(),
    }));
    hpMana.push(snap);
  }
} catch (e) {
  flowError = e.message;
  log('ERRO no fluxo:', e.message);
} finally {
  // teardown gracioso: para a caçada e deixa o save pendente terminar antes de
  // fechar, pra não capturar um ERR_ABORTED do próprio fechamento.
  tearingDown = true;
  try { await page.evaluate(() => window.toggleHunt && window.__hunting !== false && window.toggleHunt()); } catch {}
  await page.waitForTimeout(2500).catch(() => {});
  await browser.close();
}

// ---- relatório ----
const last = hpMana[hpMana.length - 1] || {};
const combatRan = (last.logLines || 0) > 3;
const manaSane = hpMana.every(s => { const n = (s.mana.match(/\d+/g) || []).map(Number); return n.length < 2 || (n[0] >= 0 && n[0] <= n[1]); });

console.log('\n=== AUDITORIA DE BROWSER ===');
console.log('linhas no log de combate (fim):', last.logLines, '| combate rodou:', combatRan);
console.log('hp/mana amostrados:', JSON.stringify(hpMana.map(s => `${s.hp} / ${s.mana}`)));

const dump = (title, m) => {
  if (!m.size) return 0;
  console.log(`\n### ${title} (${m.size} distintos)`);
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, c]) => console.log(`  - [${c}x] ${k}`));
  return m.size;
};
let problems = 0;
problems += dump('Exceções JS (pageerror)', pageErrors);
problems += dump('Erros de console', consoleErrors);
problems += dump('Requests falhos (4xx/5xx/network)', failedReq);
if (flowError) { console.log('\n### Fluxo quebrou:', flowError); problems++; }
if (!combatRan) { console.log('\n### Combate NÃO rodou (log vazio) — hunt não iniciou?'); problems++; }
if (!manaSane) { console.log('\n### Mana fora da faixa [0,max] em algum momento'); problems++; }

console.log(problems ? `\n❌ ${problems} categorias de problema` : '\n✅ nenhum problema de runtime detectado');
process.exit(problems ? 1 : 0);
