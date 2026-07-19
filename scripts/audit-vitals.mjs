// Auditor de VITAIS (HP/MP) numa batalha REAL — /loop do Felipe:
// "garanta consistencia nos numeros de HP/MP antes e após entrar numa batalha.
//  Durante a batalha veja se os numeros fazem sentido numa batalha real."
//
// Captura a trajetória de HP/MP nos 4 momentos e valida:
//   A. ANTES (ocioso, parado)         → baseline
//   B. AO ENTRAR (deu play)           → mana/hp NÃO podem pular sozinhos (bug do drop)
//   C. DURANTE (amostragem densa)     → números fazem sentido? (dentro de [0,max],
//        mana dipa ao castar, hp cai ao apanhar e volta ao curar, sem saltos absurdos)
//   D. AO PARAR                       → estado consistente com o último de batalha (sem oscilar)
// Uso: node scripts/audit-vitals.mjs   (exit 1 se achar inconsistência)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const SITE = acct.site;
const log = (...a) => console.log('[vitals]', ...a);
const problems = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const readVitals = () => page.evaluate(() => {
  const parse = t => { const n = (t || '').match(/\d+/g); return n ? n.map(Number) : []; };
  return {
    mana: parse(document.getElementById('mana-text')?.textContent || document.getElementById('player-mana-label')?.textContent),
    hp: parse(document.getElementById('hp-text')?.textContent || document.getElementById('player-hp-label')?.textContent),
    logLines: document.getElementById('combat-log')?.children.length || 0,
    logText: (document.getElementById('combat-log')?.innerText || '').slice(-1200),
  };
});
const fmt = v => `hp=${v.hp.join('/')} mp=${v.mana.join('/')}`;

try {
  log('abrindo', SITE);
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForFunction(() => { const g = document.getElementById('auth-gate'); return !g || g.style.display === 'none' || g.offsetParent === null; }, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const needChar = await page.isVisible('#char-name-input').catch(() => false);
  if (needChar) {
    await page.fill('#char-name-input', 'ClaudeAuditBot');
    await page.evaluate(() => window.createCharacter && window.createCharacter('druid'));
    log('personagem druida criado; aguardando kit...');
    await page.waitForTimeout(7000);
  }
  // garante magia de ataque (pra ver a mana dipar) e cura no RTC
  await page.evaluate(() => {
    window.setRtcAttackSpellSlot && window.setRtcAttackSpellSlot(0, 'mud_attack', 'spell');
  });
  await page.waitForTimeout(500);

  // garante que NÃO está caçando (estado ocioso limpo)
  await page.evaluate(() => { if (window.isHunting && window.isHunting()) window.toggleHunt && window.toggleHunt(); });
  await page.waitForTimeout(1500);

  const sane = v => {
    const errs = [];
    if (v.hp.length === 2) { if (v.hp[0] < 0) errs.push('hp<0'); if (v.hp[0] > v.hp[1]) errs.push(`hp>max (${v.hp[0]}>${v.hp[1]})`); }
    if (v.mana.length === 2) { if (v.mana[0] < 0) errs.push('mp<0'); if (v.mana[0] > v.mana[1]) errs.push(`mp>max (${v.mana[0]}>${v.mana[1]})`); }
    return errs;
  };

  // ===== A. ANTES (ocioso) =====
  const before = await readVitals();
  log('A. ANTES (ocioso):', fmt(before));
  sane(before).forEach(e => problems.push(`ANTES: vital insano (${e})`));

  // ===== B. AO ENTRAR (play) — capturar salto imediato =====
  await page.evaluate(() => window.pickZone && window.pickZone('troll_cave'));
  // amostra rápida nos primeiros 2.4s: o valor não pode DESPENCAR só por dar play
  let entryMinMana = before.mana[0] ?? 0, entryMinHp = before.hp[0] ?? 0, entryMaxMana = 0, entryMaxHp = 0;
  const entrySamples = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400);
    const v = await readVitals();
    entrySamples.push(v);
    if (v.mana[0] != null) { entryMinMana = Math.min(entryMinMana, v.mana[0]); entryMaxMana = Math.max(entryMaxMana, v.mana[0]); }
    if (v.hp[0] != null) { entryMinHp = Math.min(entryMinHp, v.hp[0]); entryMaxHp = Math.max(entryMaxHp, v.hp[0]); }
  }
  log('B. AO ENTRAR (2.4s):', entrySamples.map(fmt).join('  |  '));
  const maxMana = before.mana[1] || 300, maxHp = before.hp[1] || 300;
  // tolerância: uma magia castada legitimamente pode consumir mana; mas um DROP
  // grande instantâneo ao dar play (sem log de gasto) é o bug. Toleramos 1 magia.
  const manaDropEntry = (before.mana[0] ?? 0) - entryMinMana;
  const hpDropEntry = (before.hp[0] ?? 0) - entryMinHp;
  if (manaDropEntry > maxMana * 0.5) problems.push(`ENTRAR: MANA despencou ao dar play (${before.mana[0]} -> ${entryMinMana}, -${manaDropEntry}) sem batalha ainda`);
  if (hpDropEntry > maxHp * 0.5) problems.push(`ENTRAR: HP despencou ao dar play (${before.hp[0]} -> ${entryMinHp}, -${hpDropEntry}) sem batalha ainda`);
  entrySamples.forEach(v => sane(v).forEach(e => problems.push(`ENTRAR: vital insano (${e})`)));

  // ===== C. DURANTE (30s, amostragem densa a cada 1.5s) =====
  log('C. DURANTE a batalha (30s)...');
  const traj = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const v = await readVitals();
    traj.push(v);
  }
  const manaSeq = traj.map(v => v.mana[0]).filter(n => n != null);
  const hpSeq = traj.map(v => v.hp[0]).filter(n => n != null);
  log('   trajetória HP:', hpSeq.join(' → '));
  log('   trajetória MP:', manaSeq.join(' → '));
  const lastLog = traj[traj.length - 1].logText.split('\n').filter(Boolean).slice(-8);
  log('   últimas linhas do log:\n     ' + lastLog.join('\n     '));

  const combatRan = traj[traj.length - 1].logLines > (before.logLines || 0);
  if (!combatRan) problems.push('DURANTE: combate não rodou (log não cresceu) — batalha não aconteceu');
  traj.forEach((v, i) => sane(v).forEach(e => problems.push(`DURANTE[${i}]: vital insano (${e})`)));

  // números fazem sentido?
  // 1) mana precisa VARIAR (dipar ao castar magia); mana 100% estática = magia não gasta
  const manaVaried = new Set(manaSeq).size > 1;
  const manaDipped = manaSeq.some(m => m < maxMana);
  if (!manaVaried) problems.push('DURANTE: mana 100% estática numa batalha inteira — magia não consome mana ou vitais congelados');
  else if (!manaDipped) problems.push('DURANTE: mana nunca ficou abaixo do teto — magia de ataque não está gastando mana');
  // 2) hp precisa VARIAR (tomar dano do monstro / curar); hp travado no teto a
  //    luta toda contra troll = monstro não acerta (dano zerado) — suspeito.
  const hpVaried = new Set(hpSeq).size > 1;
  const hpTookDamage = hpSeq.some(h => h < maxHp);
  if (!hpVaried) problems.push('DURANTE: HP 100% estático a batalha toda — monstro não causa dano nenhum (dano zerado?) ou vitais congelados');
  else if (!hpTookDamage) problems.push('DURANTE: HP nunca caiu do teto — o monstro nunca acertou um golpe na luta inteira (suspeito)');
  // 3) saltos absurdos: uma variação de HP > 90% do teto num único passo de 1.5s
  //    (fora morte) é salto irreal. Mede o maior degrau.
  let maxHpStep = 0, maxMpStep = 0;
  for (let i = 1; i < hpSeq.length; i++) maxHpStep = Math.max(maxHpStep, Math.abs(hpSeq[i] - hpSeq[i - 1]));
  for (let i = 1; i < manaSeq.length; i++) maxMpStep = Math.max(maxMpStep, Math.abs(manaSeq[i] - manaSeq[i - 1]));
  log(`   maior degrau HP=${maxHpStep} (${(maxHpStep / maxHp * 100).toFixed(0)}% do teto) | MP=${maxMpStep}`);
  // um degrau de HP perto do teto que NÃO seja recuperação de morte (hp voltou ao
  // topo) sugere valor stale/oscilação. Curas e dano real são graduais.
  if (maxHpStep > maxHp * 0.9 && hpSeq[hpSeq.length - 1] < maxHp) problems.push(`DURANTE: salto de HP irreal num tick (${maxHpStep} de ${maxHp}) — provável valor stale/dessincronia`);

  // ===== D. AO PARAR (consistência) =====
  const duringLast = traj[traj.length - 1];
  await page.evaluate(() => { if (window.isHunting && window.isHunting()) window.toggleHunt && window.toggleHunt(); });
  await page.waitForTimeout(1200);
  const after = await readVitals();
  log('D. AO PARAR:', fmt(after), '(último em batalha:', fmt(duringLast) + ')');
  sane(after).forEach(e => problems.push(`PARAR: vital insano (${e})`));
  // ao parar, o vital não pode PULAR pra cima/baixo de forma incoerente com o
  // último de batalha (tolerância p/ 1 tick de regen ocioso ~ pequeno)
  if (after.hp.length === 2 && duringLast.hp.length === 2) {
    const jump = after.hp[0] - duringLast.hp[0];
    if (jump < -maxHp * 0.2) problems.push(`PARAR: HP CAIU ao parar (${duringLast.hp[0]} -> ${after.hp[0]}) — reset pra valor velho do servidor`);
    if (jump > maxHp * 0.35) problems.push(`PARAR: HP PULOU pra cima ao parar (${duringLast.hp[0]} -> ${after.hp[0]}) — cura fantasma/oscilação`);
  }
  if (after.mana.length === 2 && duringLast.mana.length === 2) {
    const jump = after.mana[0] - duringLast.mana[0];
    if (jump < -maxMana * 0.2) problems.push(`PARAR: MANA CAIU ao parar (${duringLast.mana[0]} -> ${after.mana[0]}) — reset pra valor velho do servidor`);
  }

} catch (e) {
  problems.push('EXCEÇÃO: ' + (e.message || String(e)));
  log('ERRO', e);
} finally {
  await browser.close();
}

console.log('\n=== AUDITORIA DE VITAIS (HP/MP em batalha real) ===');
if (problems.length) { console.log('❌ INCONSISTÊNCIAS:'); problems.forEach(p => console.log('  - ' + p)); process.exitCode = 1; }
else console.log('✅ HP/MP consistentes antes/ao-entrar/durante/após — números coerentes com batalha real');
