// Teste da página de seleção de zonas: dividir uma área em andares, mover
// monstros entre eles, nomear, copiar e sobreviver a um reload.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const erros = [];
page.on('pageerror', e => erros.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') erros.push('CONSOLE ' + m.text()); });
const falhas = [];

await page.goto(pathToFileURL(process.argv[2]).href);
// Estado limpo: a página guarda a seleção no localStorage, e sobra de uma
// execução anterior faz o teste medir outra coisa (foi o que me enganou).
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.zone');

await page.fill('#busca', "Ab'Dendriel Slimes");
await page.waitForTimeout(300);
const total = (await page.$$('.zone .m')).length;
console.log('monstros na área:', total);

await page.click('.zone [data-split]');
await page.waitForTimeout(250);
const andares = (await page.$$('.zone .andar-nome')).length;
console.log('andares após dividir:', andares);
if (andares !== 2) falhas.push(`esperava 2 andares, veio ${andares}`);

// manda 3 monstros do andar 1 para o andar 2
for (let i = 0; i < 3; i++) {
  const alvo = await page.$('.zone .andar .mons button.m');
  if (alvo) { await alvo.click(); await page.waitForTimeout(150); }
}
const dist = await page.$$eval('.zone .andar', els => els.map(a => ({
  rotulo: a.querySelector('.andar-nome')
    ? (a.querySelector('.andar-nome').value || a.querySelector('.andar-nome').placeholder)
    : 'fora',
  mons: [...a.querySelectorAll('button.m')].map(m => m.textContent),
})));
console.log('distribuição:', JSON.stringify(dist));
const soma = dist.reduce((n, d) => n + d.mons.length, 0);
if (soma !== total) falhas.push(`monstros sumiram: ${total} -> ${soma}`);
if (dist.length < 2 || !dist[1].mons.length) falhas.push('o 2º andar ficou vazio depois de mover');

await page.fill('.zone .andar:nth-of-type(2) .andar-nome', 'andar de baixo');
await page.waitForTimeout(250);
await page.click('#copiar');
await page.waitForTimeout(300);
const saida = await page.inputValue('#saida');
console.log('--- saída ---\n' + saida);
if (!/andar de baixo/.test(saida)) falhas.push('o nome do andar não saiu no texto copiado');
if (saida.split('\n').filter(l => /^\s+lv /.test(l)).length < 2) falhas.push('a saída não gerou uma linha por andar');

const hunts = await page.textContent('#conta');
console.log('contador:', hunts, 'hunts');
if (+hunts !== 2) falhas.push(`contador deveria mostrar 2 hunts, mostrou ${hunts}`);

await page.reload();
await page.waitForSelector('.zone');
await page.fill('#busca', "Ab'Dendriel Slimes");
await page.waitForTimeout(400);
const depois = (await page.$$('.zone .andar-nome')).length;
const nomeSalvo = await page.inputValue('.zone .andar:nth-of-type(2) .andar-nome').catch(() => '');
console.log('após recarregar: andares =', depois, '| nome do 2º =', JSON.stringify(nomeSalvo));
if (depois !== 2) falhas.push('a divisão não sobreviveu ao reload');
if (nomeSalvo !== 'andar de baixo') falhas.push('o nome do andar não sobreviveu ao reload');

if (erros.length) falhas.push('erros: ' + erros.join(' | '));
console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
await browser.close();
