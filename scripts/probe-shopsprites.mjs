// Verifica que NENHUM item da loja cai no emoji de fallback (todo ícone tem
// que ser uma <img> de sprite real que carregou), que as duas runas removidas
// sumiram, e que a wand renomeada aparece com o nome real.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 160)));
page.on('response', r => { if (r.status() === 404 && /sprites/.test(r.url())) errs.add('404 ' + r.url().split('/').pop()); });

const ABAS = { equipment: ['melee', 'ranged', 'magic'], magic: ['potions', 'runes'] };
const falhas = [];
try {
  await page.goto(acct.site + '?cb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#auth-email', { timeout: 30000 });
  await page.fill('#auth-email', acct.email);
  await page.fill('#auth-password', acct.password);
  await page.click('#auth-submit');
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    let n = document.getElementById('shop-content');
    while (n && n !== document.body) { n.style.display = 'block'; n.style.visibility = 'visible'; n = n.parentElement; }
  });

  const todosNomes = [];
  for (const [loja, grupos] of Object.entries(ABAS)) {
    await page.evaluate(k => window.setShopTab(k), loja);
    await page.waitForTimeout(400);
    for (const g of grupos) {
      await page.evaluate(([l, gg]) => window.setShopGroup(l, gg), [loja, g]);
      await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const linhas = [...document.querySelectorAll('.trade-row')];
        const semSprite = [], quebradas = [];
        for (const l of linhas) {
          const nome = l.querySelector('.trade-row-name').textContent.trim();
          const img = l.querySelector('.trade-row-icon img');
          if (!img) { semSprite.push(nome); continue; }
          // naturalWidth 0 = a imagem não carregou
          if (!img.complete || img.naturalWidth === 0) quebradas.push(nome);
        }
        return { total: linhas.length, semSprite, quebradas, nomes: linhas.map(l => l.querySelector('.trade-row-name').textContent.trim()) };
      });
      todosNomes.push(...r.nomes);
      console.log(`${loja}/${g}: ${r.total} itens | sem sprite (emoji): ${r.semSprite.length} | sprite quebrada: ${r.quebradas.length}`);
      if (r.semSprite.length) falhas.push(`${loja}/${g} caiu no emoji: ${r.semSprite.join(', ')}`);
      if (r.quebradas.length) falhas.push(`${loja}/${g} sprite não carregou: ${r.quebradas.join(', ')}`);
    }
  }

  for (const proibido of ['Create Food Rune', 'Great Light Rune', 'Wand of Dementia']) {
    if (todosNomes.includes(proibido)) falhas.push(`"${proibido}" ainda aparece na loja`);
  }
  if (!todosNomes.includes('Wand of Defiance')) falhas.push('"Wand of Defiance" não apareceu na loja');
  console.log(`\nWand of Defiance presente: ${todosNomes.includes('Wand of Defiance')}`);
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  if (errs.size) falhas.push('erros/404: ' + [...errs].join(' | '));
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
