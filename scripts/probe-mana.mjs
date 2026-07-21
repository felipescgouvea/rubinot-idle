// Diagnóstico: captura qualquer leitura de mana onde atual > teto durante a
// caçada, com os valores exatos + se o nível mudou (level-up), pra medir a
// severidade do "mana fora de [0,max]" do audit-browser.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const acct = JSON.parse(readFileSync(join(ROOT, '.test-account.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(acct.site, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email); await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.setRtcAttackSpellSlot && window.setRtcAttackSpellSlot(0, 'mud_attack', 'spell'));
  await page.evaluate(() => window.pickZone && window.pickZone('troll_cave'));
  const violations = [];
  let lastLevel = null;
  for (let i = 0; i < 80; i++) { // ~40s a 500ms
    const v = await page.evaluate(() => {
      const parse = t => (t || '').match(/\d+/g)?.map(Number) || [];
      return {
        manaText: document.getElementById('mana-text')?.textContent || '',
        battleLabel: document.getElementById('player-mana-label')?.textContent || '',
        level: document.getElementById('hdr-level')?.textContent || '',
        mt: parse(document.getElementById('mana-text')?.textContent),
        bl: parse(document.getElementById('player-mana-label')?.textContent),
      };
    }).catch(() => null);
    if (v) {
      if (lastLevel !== null && v.level !== lastLevel) violations.push({ i, event: 'LEVEL_UP', from: lastLevel, to: v.level, manaText: v.manaText, battleLabel: v.battleLabel });
      lastLevel = v.level;
      if (v.mt.length === 2 && v.mt[0] > v.mt[1]) violations.push({ i, src: 'mana-text', val: v.manaText, level: v.level });
      if (v.bl.length === 2 && v.bl[0] > v.bl[1]) violations.push({ i, src: 'battle-label', val: v.battleLabel, level: v.level });
    }
    await page.waitForTimeout(500);
  }
  console.log('[probe] violações/eventos:', violations.length);
  violations.slice(0, 20).forEach(x => console.log('   ', JSON.stringify(x)));
} catch (e) { console.log('ERRO', e.message); }
finally { await browser.close(); }
