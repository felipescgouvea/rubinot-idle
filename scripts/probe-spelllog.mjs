// Probe: o log de combate mostra o DANO da magia NA MESMA LINHA da magia (🗣️),
// e a cura na linha da magia de cura. Caça com magia e inspeciona o log.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const problems = [];
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForFunction(() => { const g = document.getElementById('auth-gate'); return !g || g.offsetParent === null; }, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.setRtcAttackSpellSlot && window.setRtcAttackSpellSlot(0, 'mud_attack', 'spell'));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.pickZone && window.pickZone('troll_cave'));
  await page.waitForTimeout(30000); // caça 30s
  const lines = await page.evaluate(() => Array.from(document.getElementById('combat-log')?.children || []).map(c => c.innerText).slice(-40));
  await browser.close();
  console.log('[probe] últimas linhas do log:');
  lines.slice(-12).forEach(l => console.log('   ', l));
  // uma linha de magia (🗣️) DEVE conter um número de dano
  const spellLines = lines.filter(l => /🗣️/.test(l));
  const spellWithDmg = spellLines.some(l => /\d/.test(l.replace(/🗣️/g, '')));
  console.log('[probe] linhas de magia:', spellLines.length, '| com número de dano:', spellWithDmg);
  if (!spellLines.length) problems.push('nenhuma linha de magia (🗣️) no log — magia não logou');
  else if (!spellWithDmg) problems.push('linha de magia SEM número de dano (dano não veio na mesma linha)');
} catch (e) { problems.push('EXCEÇÃO: ' + e.message); try { await browser.close(); } catch {} }
console.log(problems.length ? '\n❌ ' + problems.join('\n❌ ') : '\n✅ Magia loga o dano na mesma linha (🗣️ + número)');
process.exitCode = problems.length ? 1 : 0;
