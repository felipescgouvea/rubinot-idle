// Teste das lojas de NPC: cada aba tem que mostrar SÓ os itens do seu tipo,
// com uma lista rolável e um único botão de comprar, e trocar de aba não pode
// deixar selecionado um item que não está mais na lista.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const acct = JSON.parse(readFileSync('.test-account.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = new Set();
page.on('pageerror', e => errs.add('PAGEERR ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.add('CONSOLE ' + m.text().slice(0, 180)); });

// aba -> tipos de item que PODEM aparecer nela
const ESPERADO = {
  equipment: {
    melee: ['weapon:sword', 'weapon:axe', 'weapon:club', 'armor', 'shield', 'helmet', 'legs', 'boots', 'ring'],
    ranged: ['weapon:distance', 'ammo'],
    magic: ['weapon:magic'],
  },
  magic: {
    potions: ['potion', 'refill'],
    runes: ['rune'],
  },
};

let falhas = [];
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

  for (const [loja, grupos] of Object.entries(ESPERADO)) {
    await page.evaluate(k => window.setShopTab(k), loja);
    await page.waitForTimeout(500);
    const abas = await page.evaluate(() => [...document.querySelectorAll('.admin-subtab-btn')].map(b => b.textContent.trim()));
    console.log(`\n=== ${loja} === abas: ${abas.join(' | ') || 'NENHUMA'}`);
    if (abas.length !== Object.keys(grupos).length) falhas.push(`${loja}: esperava ${Object.keys(grupos).length} abas, achou ${abas.length}`);

    for (const g of Object.keys(grupos)) {
      await page.evaluate(([l, gg]) => window.setShopGroup(l, gg), [loja, g]);
      await page.waitForTimeout(400);
      const info = await page.evaluate(async () => {
        const cat = await import('./src/domain/shopCatalog.js?v=166');
        const it = await import('./src/domain/items.js?v=178');
        const w = document.querySelector('.trade-window');
        if (!w) return null;
        const nomes = [...w.querySelectorAll('.trade-row-name')].map(n => n.textContent.trim());
        // deduz o tipo de cada linha pelo catálogo
        const tipos = nomes.map(nome => {
          const s = cat.SHOP_ITEMS.find(x => (x.name || '').includes(nome) || nome.includes((x.name || '').replace(/^shop\./, '')));
          const item = s && s.itemId ? it.ITEMS[s.itemId] : null;
          if (!item) return s ? s.type : '?';
          return item.weaponType ? `weapon:${item.weaponType}` : item.type;
        });
        return {
          linhas: nomes.length,
          botoes: w.querySelectorAll('.trade-buy-btn').length,
          listasRolaveis: w.querySelectorAll('.trade-list').length,
          selecionadas: w.querySelectorAll('.trade-row.selected').length,
          selecionadaVisivel: !!w.querySelector('.trade-row.selected'),
          tipos: [...new Set(tipos)],
        };
      });
      if (!info) { falhas.push(`${loja}/${g}: sem janela de trade`); continue; }
      const inesperados = info.tipos.filter(tp => tp !== '?' && !grupos[g].includes(tp));
      console.log(`  ${g}: ${info.linhas} itens | tipos: ${info.tipos.join(', ')}`);
      if (info.botoes !== 1) falhas.push(`${loja}/${g}: ${info.botoes} botões de comprar (esperado 1)`);
      if (info.listasRolaveis !== 1) falhas.push(`${loja}/${g}: ${info.listasRolaveis} listas (esperado 1)`);
      if (info.selecionadas !== 1) falhas.push(`${loja}/${g}: ${info.selecionadas} itens selecionados (esperado 1)`);
      if (!info.selecionadaVisivel) falhas.push(`${loja}/${g}: item selecionado não está na lista da aba`);
      if (!info.linhas) falhas.push(`${loja}/${g}: aba vazia`);
      if (inesperados.length) falhas.push(`${loja}/${g}: tipos fora do lugar -> ${inesperados.join(', ')}`);
    }
  }
} catch (e) {
  falhas.push('EXCEÇÃO ' + e.message);
} finally {
  console.log('\nerros de página:', [...errs].join(' | ') || 'nenhum');
  if (errs.size) falhas.push('houve erro de página');
  console.log(falhas.length ? `\nRESULTADO: FALHOU\n - ${falhas.join('\n - ')}` : '\nRESULTADO: PASSOU');
  await browser.close();
}
