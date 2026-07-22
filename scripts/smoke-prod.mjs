// SMOKE DE PRODUÇÃO — o jogo sobe num navegador REAL, com cache real.
//
// O smoke anterior carregava com `?cb=<timestamp>`, o que fura o cache do
// navegador. Ele passou verde enquanto o jogo estava MORTO pro Felipe: o
// navegador dele tinha um módulo cacheado pela metade e a página nem iniciava.
// Um teste que só sabe testar o caminho feliz é pior que nenhum, porque dá
// autorização pra dizer "está no ar".
//
// Aqui são três cargas, sem cache-buster nenhum:
//   1. FRIA   — primeira visita
//   2. QUENTE — F5 com tudo em cache (o caso do Felipe)
//   3. MEIO-DEPLOY — simula o cenário real que quebrou: o navegador guarda os
//      BYTES VELHOS de um módulo sob a URL NOVA (?v=N não identifica conteúdo
//      no servidor, é só query string). Aqui a auto-cura do index.html tem que
//      se virar sozinha e o jogo tem que subir mesmo assim.
//
// Uso: node scripts/smoke-prod.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const SITE = acct.site;
const problemas = [], ok = [];
const IGNORAR = /favicon|net::ERR_INTERNET|40[34]\b/i;

async function carregar(page, rotulo) {
  const erros = new Set();
  const onErr = e => erros.add(String(e.message || e).slice(0, 220));
  page.on('pageerror', onErr);
  page.on('console', m => { if (m.type() === 'error') erros.add('console: ' + m.text().slice(0, 220)); });
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Espera o jogo dar sinal de vida OU o tempo acabar — não basta "carregou o
  // HTML": o sintoma da falha era HTML na tela e módulo morto por trás.
  const vivo = await page.waitForFunction(() => window.__jogoVivo === true, null, { timeout: 25000 })
    .then(() => true).catch(() => false);
  const gate = await page.evaluate(() => !!document.getElementById('auth-email') || !!document.getElementById('app'));
  const reais = [...erros].filter(e => !IGNORAR.test(e));
  page.removeListener('pageerror', onErr);
  if (!vivo) problemas.push(`${rotulo}: o jogo NÃO deu sinal de vida (window.__jogoVivo) em 25s`);
  else ok.push(`${rotulo}: jogo iniciou`);
  if (!gate) problemas.push(`${rotulo}: nem o gate de login nem o app existem no DOM`);
  if (reais.length) reais.forEach(e => problemas.push(`${rotulo}: ${e}`));
  return { vivo, erros: reais };
}

const browser = await chromium.launch({ headless: true });
// UM contexto só nas duas primeiras cargas, de propósito: é isso que preserva o
// cache HTTP entre elas e reproduz o F5 de um jogador de verdade.
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  await carregar(page, 'carga FRIA');
  await carregar(page, 'carga QUENTE (F5 com cache)');

  // ---- 3. MEIO-DEPLOY: envenena o cache como a propagação do Pages faz ----
  // Serve conteúdo ANTIGO (sem o export novo) para um módulo, mantendo a URL
  // versionada nova. Sem a auto-cura, isto mata o jogo por 10 minutos.
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  let envenenou = false;
  await page2.route('**/infrastructure/authClient.js*', async route => {
    if (envenenou) return route.continue();
    envenenou = true;
    // Um módulo válido, mas SEM os exports que o main.js espera — exatamente a
    // forma do erro que apareceu ("does not provide an export named ...").
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const nada = 1;' });
  });
  const r3 = await carregar(page2, 'MEIO-DEPLOY (módulo velho sob URL nova)');
  if (r3.vivo) ok.push('auto-cura: o jogo se recuperou sozinho de um módulo cacheado pela metade');
  else problemas.push('auto-cura NÃO funcionou: com um módulo velho em cache o jogo fica morto, como ficou pro Felipe');
  await ctx2.close();

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(66));
console.log('SMOKE DE PRODUÇÃO (cache real, sem cache-buster)');
console.log('='.repeat(66));
ok.forEach(o => console.log('  ✓ ' + o));
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  [...new Set(problemas)].forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else {
  console.log('\nRESULTADO: PASSOU — o jogo sobe frio, quente e com cache envenenado');
}
