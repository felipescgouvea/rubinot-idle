// AUDITORIA DO MARCO DE RESET — um save local antigo é MESMO descartado?
//
// Existe porque zerar o banco não resetou ninguém: o save vive em localStorage
// E no Supabase, e no F5 seguinte o navegador restaurava o personagem do local
// e ainda reescrevia na nuvem. O teste semeia exatamente esse cenário.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], ok = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await page.waitForTimeout(2500);

  // Semeia um personagem local + um marco VELHO, como um jogador que já jogava
  // antes do reset.
  await page.evaluate(() => {
    localStorage.setItem('rubinot_idle_v1', JSON.stringify({
      activeSlot: 0,
      slots: [{ vocation: 'paladin', level: 42, xp: 999, gold: 12345, graduated: true,
                inventory: { bow: 1 }, equipment: { weapon: 'bow' } }, null],
    }));
    localStorage.setItem('rubinot_save_epoch', 'marco-antigo');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const depois = await page.evaluate(() => ({
    epochLocal: localStorage.getItem('rubinot_save_epoch'),
    saveLocal: localStorage.getItem('rubinot_idle_v1'),
    criacaoVisivel: document.getElementById('char-create-overlay')?.style.display === 'flex',
    vocacao: window.__G ? window.__G.vocation : undefined,
  }));
  console.log(JSON.stringify({ ...depois, saveLocal: depois.saveLocal ? depois.saveLocal.slice(0, 80) + '…' : null }, null, 1));

  if (depois.epochLocal === 'marco-antigo') problemas.push('o marco local NÃO foi atualizado — o save velho sobrevive a todo reload');
  else ok.push(`marco local atualizado para "${depois.epochLocal}"`);

  const aindaTemPersonagem = depois.saveLocal && /"vocation":"paladin"/.test(depois.saveLocal) && /"level":42/.test(depois.saveLocal);
  if (aindaTemPersonagem) problemas.push('o personagem de nível 42 continua no save local — o reset não pegou');
  else ok.push('save local antigo descartado');

  if (!depois.criacaoVisivel) problemas.push('a tela de criação NÃO apareceu depois do reset — o jogador caiu em algum estado antigo');
  else ok.push('caiu na criação de personagem, como esperado após o reset');

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(64));
console.log('AUDITORIA DO MARCO DE RESET');
console.log('='.repeat(64));
ok.forEach(o => console.log('  ✓ ' + o));
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  problemas.forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else console.log('\nRESULTADO: PASSOU — save local antigo é descartado no reset');
