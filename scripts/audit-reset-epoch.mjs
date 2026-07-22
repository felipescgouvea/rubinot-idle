// AUDITORIA DO MARCO DE RESET — um save local antigo é MESMO descartado?
//
// Existe porque zerar o banco não resetou ninguém: o save vive em localStorage
// E no Supabase, e no F5 seguinte o navegador restaurava o personagem do local
// e ainda reescrevia na nuvem. O teste semeia exatamente esse cenário.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { login } from './probe-lib.mjs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], ok = [], inconclusivos = [];
const browser = await chromium.launch({ headless: true });
const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx0.newPage();

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

  // ---- CASO 2: navegador NOVO, com personagem na nuvem ----
  // Sem marco guardado não dá pra distinguir "jogador de antes do reset" de
  // "primeiro acesso neste navegador". Tratar os dois igual apagava o
  // personagem de quem só abriu o jogo em outro dispositivo — bug que eu mesmo
  // introduzi no conserto do reset e que só apareceu porque um probe entrou
  // com localStorage limpo e viu "conta sem personagem".
  const ctxNovo = await browser.newContext();
  const pNovo = await ctxNovo.newPage();
  await pNovo.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(pNovo, acct);
  await pNovo.waitForTimeout(7000);
  const novo = await pNovo.evaluate(() => ({
    vocacao: window.__G ? window.__G.vocation : undefined,
    epoch: localStorage.getItem('rubinot_save_epoch'),
  }));
  console.log('navegador novo:', JSON.stringify(novo));
  if (!novo.epoch) problemas.push('navegador novo não gravou o marco — vai "resetar" de novo em toda visita');
  else ok.push('navegador novo grava o marco');
  // PRÉ-CONDIÇÃO: só dá pra afirmar que o marco preservou o save da nuvem se
  // existir save na nuvem. Logo depois de um reset não existe, e sem esta
  // checagem o probe acusa "o marco apagou o personagem" quando na verdade não
  // havia personagem nenhum — falso positivo que apareceu no reset #2.
  const temNaNuvem = await pNovo.evaluate(async () => {
    const ac = await window.__liveImport('authClient.js');
    const r = await ac.loadCloudSave().catch(() => null);
    const s0 = r && r.data && r.data.slots && r.data.slots[0];
    return !!(s0 && s0.vocation);
  }).catch(() => false);

  if (!temNaNuvem) {
    inconclusivos.push('não há personagem na nuvem (banco recém-resetado) — o cenário "navegador novo preserva o save" não pôde ser exercitado');
  } else if (!novo.vocacao) {
    problemas.push('navegador NOVO entrou sem personagem mesmo HAVENDO save na nuvem — o marco está apagando save de quem troca de dispositivo');
  } else ok.push(`navegador novo carregou o personagem da nuvem (${novo.vocacao})`);
  await ctxNovo.close();

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(64));
console.log('AUDITORIA DO MARCO DE RESET');
console.log('='.repeat(64));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) {
  console.log('\n⚠  INCONCLUSIVO:');
  inconclusivos.forEach(i => console.log('  - ' + i));
}
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  problemas.forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else if (inconclusivos.length) {
  console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas nem tudo foi exercitado');
  process.exitCode = 2;
} else console.log('\nRESULTADO: PASSOU — save local antigo é descartado no reset');
