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
const problemas = [], ok = [], inconclusivos = [];
const IGNORAR = /favicon|net::ERR_INTERNET|40[34]\b/i;

async function carregar(page, rotulo, erroEsperado = false) {
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
  // No cenário envenenado o erro de import é a PRECONDIÇÃO, não a falha: é ele
  // que dispara a auto-cura. Julgar por "houve erro" reprovaria justamente o
  // teste que prova que o mecanismo funciona. Ali o que importa é se o jogo
  // subiu depois.
  if (reais.length && !erroEsperado) reais.forEach(e => problemas.push(`${rotulo}: ${e}`));
  else if (reais.length) console.log(`  · ${rotulo}: erro esperado antes da auto-cura — ${reais[0]}`);
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
  const r3 = await carregar(page2, 'MEIO-DEPLOY (módulo velho sob URL nova)', true);
  if (r3.vivo) ok.push('auto-cura: o jogo se recuperou sozinho de um módulo cacheado pela metade');
  else problemas.push('auto-cura NÃO funcionou: com um módulo velho em cache o jogo fica morto, como ficou pro Felipe');
  await ctx2.close();

  // ---- 4. CONTRAPROVA: o mesmo veneno, com a auto-cura REMOVIDA ----
  // Sem isto, "o jogo se recuperou" poderia ser coincidência (o Playwright só
  // envenena a primeira requisição). Aqui a auto-cura é arrancada do HTML: se o
  // jogo AINDA subir, é porque o cenário não reproduz de fato o bug e o teste
  // acima não vale nada.
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  let htmlNeutralizado = false;
  // Desliga a auto-cura DE VERDADE: troca o nome do evento escutado, para o
  // listener nunca disparar. (Na primeira versão eu só renomeei a chave do
  // sessionStorage — a auto-cura seguia ativa e a contraprova não testava
  // nada, mas mesmo assim deu um veredito confiante.)
  const neutralizar = async route => {
    const resp = await route.fetch();
    const html = await resp.text();
    const novo = html.replace("addEventListener('error'", "addEventListener('evento-que-nunca-ocorre'");
    htmlNeutralizado = novo !== html;
    await route.fulfill({ response: resp, body: novo, headers: { ...resp.headers(), 'content-type': 'text/html; charset=utf-8' } });
  };
  await page3.route(u => u.href === SITE || u.pathname.endsWith('/index.html'), neutralizar);
  let envenenou3 = false;
  await page3.route('**/infrastructure/authClient.js*', async route => {
    if (envenenou3) return route.continue();
    envenenou3 = true;
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const nada = 1;' });
  });
  await page3.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const vivoSemCura = await page3.waitForFunction(() => window.__jogoVivo === true, null, { timeout: 12000 })
    .then(() => true).catch(() => false);
  if (!htmlNeutralizado) {
    // Sem confirmar que a auto-cura saiu, qualquer conclusão aqui é chute.
    inconclusivos.push('CONTRAPROVA: não consegui desligar a auto-cura no HTML — este cenário não vale como prova');
  } else if (vivoSemCura) {
    problemas.push('CONTRAPROVA: o jogo subiu mesmo SEM a auto-cura — o cenário 3 não reproduz o bug e não prova nada');
  } else {
    ok.push('contraprova: sem a auto-cura o jogo fica morto (o cenário reproduz o bug de verdade)');
  }
  await ctx3.close();

} catch (e) {
  problemas.push('EXCEÇÃO: ' + (e.message || String(e)));
} finally {
  await browser.close();
}

console.log('\n' + '='.repeat(66));
console.log('SMOKE DE PRODUÇÃO (cache real, sem cache-buster)');
console.log('='.repeat(66));
ok.forEach(o => console.log('  ✓ ' + o));
if (inconclusivos.length) {
  console.log('\n⚠  INCONCLUSIVO:');
  inconclusivos.forEach(i => console.log('  - ' + i));
}
if (problemas.length) {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  [...new Set(problemas)].forEach(p => console.log('  ✗ ' + p));
  process.exitCode = 1;
} else if (inconclusivos.length) {
  console.log('\nRESULTADO: INCONCLUSIVO — nada quebrado, mas nem tudo foi exercitado');
  process.exitCode = 2;
} else {
  console.log('\nRESULTADO: PASSOU — o jogo sobe frio, quente e com cache envenenado');
}
