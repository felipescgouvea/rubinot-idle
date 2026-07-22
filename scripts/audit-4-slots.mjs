// AUDITORIA DOS 4 SLOTS DE PERSONAGEM — a conta cresceu de 2 pra 4?
//
// O limite morava em quatro lugares independentes (banco, REST, WebSocket,
// cliente) e basta UM discordar pro jogador criar um personagem que não salva:
// a tela mostra o slot, ele joga, e o servidor recusa toda gravação. Este
// probe entra pelo mesmo caminho do jogador e cobra a prova no lado do
// servidor, não na tela.
//
// Uso: node scripts/audit-4-slots.mjs [--slot=2]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { instalarLiveImport, login, esperarReload } from './probe-lib.mjs';

const arg = (n, d) => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1] || d;
const ALVO = Number(arg('slot', 2));
const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const problemas = [], ok = [], inconclusivos = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.on('dialog', d => d.accept());

try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await login(page, acct);
  await instalarLiveImport(page);

  // 1. A conta enxerga 4 slots?
  const slots = await page.evaluate(async () => {
    const a = await window.__liveImport('accountUseCases.js');
    const gs = await window.__liveImport('gameStore.js');
    return { lista: a.getCharacterSlots(), tamanho: gs.ACCOUNT.slots.length, ativo: gs.ACCOUNT.activeSlot };
  });
  console.log(`slots visíveis: ${slots.lista.length} · array: ${slots.tamanho} · ativo: ${slots.ativo}`);
  if (slots.lista.length !== 4) problemas.push(`a conta mostra ${slots.lista.length} slot(s), não 4`);
  else ok.push('a conta mostra 4 slots');

  // Um slot ACIMA do limite tem que ser RECUSADO. Sem inverter a expectativa
  // aqui, rodar com --slot=4 acusava de bug justamente a proteção funcionando —
  // e um limite que não recusa nada não é limite.
  const deveRecusar = ALVO >= slots.lista.length;
  if (deveRecusar) console.log(`(slot ${ALVO} está ACIMA do limite — o esperado aqui é RECUSA)`);

  // 2. O SERVIDOR aceita o slot novo? É aqui que mora a diferença entre
  // "aparece na tela" e "funciona": banco e rotas precisam concordar.
  const resp = await page.evaluate(async (slot) => {
    const ac = await window.__liveImport('authClient.js');
    try { return await ac.grantStarterKit(slot, 'knight'); }
    catch (e) { return { erro: e.message || String(e) }; }
  }, ALVO);
  console.log(`kit inicial no slot ${ALVO}:`, JSON.stringify(resp).slice(0, 200));
  const recusouPorSlot = resp && /slot/i.test(JSON.stringify(resp)) && /inválid|invalid/i.test(JSON.stringify(resp));
  if (deveRecusar) {
    if (recusouPorSlot) ok.push(`o servidor RECUSOU o slot ${ALVO}, como deve — o limite existe de verdade`);
    else problemas.push(`o servidor ACEITOU o slot ${ALVO}, acima do limite — a validação não está pegando`);
  } else if (recusouPorSlot) problemas.push(`o servidor recusou o slot ${ALVO} — REST ou banco ainda no limite antigo`);
  else if (resp && resp.erro) inconclusivos.push(`chamada ao servidor falhou por outro motivo: ${resp.erro}`);
  else ok.push(`o servidor aceitou gravar no slot ${ALVO}`);

  // 3. A gravação SOBREVIVEU no servidor? A caçada é autoritativa no servidor,
  // então iniciar uma no slot novo é a prova de ponta a ponta: ela só sobe se
  // houver estado de personagem gravado PRA AQUELE SLOT.
  const cacada = await page.evaluate(async (slot) => {
    const ac = await window.__liveImport('authClient.js');
    try {
      const r = await ac.getHuntState(slot);
      return { ok: true, resposta: JSON.stringify(r).slice(0, 180) };
    } catch (e) { return { ok: false, erro: e.message || String(e) }; }
  }, ALVO).catch(e => ({ ok: false, erro: String(e) }));
  console.log(`estado de caçada do slot ${ALVO}:`, JSON.stringify(cacada).slice(0, 220));
  const invalidoNaCacada = cacada.ok && /slot/i.test(cacada.resposta) && /inválid|invalid/i.test(cacada.resposta);
  if (!cacada.ok) problemas.push(`o servidor não respondeu pelo slot ${ALVO}: ${cacada.erro}`);
  else if (deveRecusar) {
    if (invalidoNaCacada) ok.push(`a consulta de caçada também recusa o slot ${ALVO}`);
    else problemas.push(`a consulta de caçada ACEITOU o slot ${ALVO}, acima do limite`);
  } else if (invalidoNaCacada) problemas.push(`o servidor tratou o slot ${ALVO} como inválido ao consultar a caçada`);
  else ok.push(`o servidor responde consultas do slot ${ALVO}`);

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(62));
console.log('AUDITORIA DOS 4 SLOTS DE PERSONAGEM');
console.log('='.repeat(62));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) { console.log('\n⚠  INCONCLUSIVO:'); inconclusivos.forEach(i => console.log('  - ' + i)); }
if (problemas.length) { console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`); problemas.forEach(p => console.log('  ✗ ' + p)); process.exitCode = 1; }
else if (inconclusivos.length) { console.log('\nRESULTADO: INCONCLUSIVO'); process.exitCode = 2; }
else console.log('\nRESULTADO: PASSOU');
