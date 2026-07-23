// AUDITA/CORRIGE a loja de gold pela regra do Felipe:
//   - item COMPRÁVEL de NPC no Tibia (npcprice > 0)  -> fica, preço = npcprice.
//   - item NÃO comprável (npcprice 0 / buyfrom "--")  -> REMOVIDO da loja.
//     (não se inventa preço pra algo que o Tibia não vende — some da loja.)
//
// Isso mata de vez a arbitragem (steel_boots/golden_* etc. compravam mais barato
// do que vendiam) e deixa a loja fiel: só o que um NPC realmente vende.
//
// Fonte do preço = `npcprice` do TibiaWiki. Item cuja página não veio do wiki
// fica INTOCADO e é reportado (não remove no escuro).
//
// Uso: node scripts/audit-loja-precos.mjs [--aplicar]
import { SHOP_ITEMS } from '../src/domain/shopCatalog.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const APLICAR = process.argv.includes('--aplicar');
const shop = SHOP_ITEMS.filter(s => s.currency === 'gold' && s.itemId);
const nomeDe = s => ITEMS[s.itemId]?.name || s.itemId;

const cacheTxt = nome => {
  const f = 'scripts/.wiki-cache/' + nome.replace(/ /g, '_') + '.txt';
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};
const wikiTxt = new Map();
for (const s of shop) { const t = cacheTxt(nomeDe(s)); if (t) wikiTxt.set(nomeDe(s).toLowerCase(), t); }
const faltam = shop.filter(s => !wikiTxt.has(nomeDe(s).toLowerCase()));
for (let i = 0; i < faltam.length; i += 40) {
  const chunk = faltam.slice(i, i + 40);
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&redirects=1&titles='
    + encodeURIComponent(chunk.map(nomeDe).join('|'));
  try {
    const json = JSON.parse(execFileSync('curl', ['-s', '-m', '60', url], { maxBuffer: 1 << 28 }).toString());
    for (const p of Object.values(json.query?.pages || {})) {
      const txt = p.revisions?.[0]?.slots?.main?.['*'];
      if (txt) wikiTxt.set(p.title.toLowerCase(), txt);
    }
  } catch (e) { console.log('falha no lote', i, e.message); }
}

const fetchTxt = titulo => {
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&redirects=1&titles=' + encodeURIComponent(titulo);
  try {
    const json = JSON.parse(execFileSync('curl', ['-s', '-m', '60', url], { maxBuffer: 1 << 28 }).toString());
    const p = Object.values(json.query?.pages || {})[0];
    return p?.revisions?.[0]?.slots?.main?.['*'] || null;
  } catch { return null; }
};

const info = nome => {
  let txt = wikiTxt.get(nome.toLowerCase());
  // Runa: a página do nome é a do FEITIÇO (Infobox Spell, sem npcprice). O item
  // com o preço mora em "<Nome> (Item)". Re-busca quando for esse o caso.
  if (txt && !/npcprice/i.test(txt) && /Infobox Spell/i.test(txt)) {
    const alt = fetchTxt(nome + ' (Item)');
    if (alt && /npcprice/i.test(alt)) txt = alt;
  }
  if (!txt) return null;
  const npc = Number((txt.match(/npcprice\s*=\s*(\d+)/i) || [])[1] || 0);
  const buyfrom = (txt.match(/buyfrom\s*=\s*([^\n|]*)/i) || [])[1]?.trim() || '';
  const buyable = npc > 0 && !/^-+$/.test(buyfrom) && buyfrom !== '';
  return { npc, buyfrom, buyable };
};

let src = readFileSync('src/domain/shopCatalog.js', 'utf8');
const remover = [], reprecificar = [], semDado = [], guarda = [];

for (const s of shop) {
  const it = ITEMS[s.itemId]; const sell = it?.sell || 0;
  const w = info(nomeDe(s));
  if (!w) { semDado.push(s.itemId); continue; }

  if (!w.buyable) { remover.push(s); continue; }

  // comprável: preço = npcprice. Guarda contra arbitragem residual (dado
  // estranho do wiki onde npcprice <= venda) — nunca deixa comprar <= vender.
  let novo = w.npc;
  if (sell > 0 && novo <= sell) { novo = sell + Math.ceil(sell * 0.2); guarda.push(`${s.itemId}: npcprice ${w.npc} <= venda ${sell}, forçado ${novo}`); }
  if (novo !== s.price) reprecificar.push({ s, de: s.price, para: novo });
}

// aplica: primeiro reprecifica, depois remove linhas (de trás pra frente pra não
// bagunçar índices de string).
for (const { s, para } of reprecificar) {
  const pos = src.indexOf(`itemId: '${s.itemId}'`);
  if (pos < 0) continue;
  const ini = src.lastIndexOf('\n', pos) + 1, fim = src.indexOf('\n', pos);
  const linha = src.slice(ini, fim);
  src = src.slice(0, ini) + linha.replace(/(\bprice:\s*)\d+/, '$1' + para) + src.slice(fim);
}
for (const s of remover) {
  const pos = src.indexOf(`id: '${s.id}'`);
  if (pos < 0) continue;
  const ini = src.lastIndexOf('\n', pos) + 1;
  let fim = src.indexOf('\n', pos); if (fim < 0) fim = src.length;
  src = src.slice(0, ini) + src.slice(fim + 1);
}

console.log(`itens de gold: ${shop.length}`);
console.log(`\nREMOVIDOS (não compráveis de NPC no Tibia): ${remover.length}`);
remover.forEach(s => console.log(`  − ${s.itemId} ("${nomeDe(s)}") venda ${ITEMS[s.itemId]?.sell}`));
console.log(`\nREPRECIFICADOS pro npcprice: ${reprecificar.length}`);
reprecificar.slice(0, 30).forEach(r => console.log(`  ~ ${r.s.itemId}: ${r.de} -> ${r.para}`));
if (reprecificar.length > 30) console.log(`  ... +${reprecificar.length - 30}`);
if (guarda.length) { console.log(`\nGUARDA anti-arbitragem (npcprice esquisito): ${guarda.length}`); guarda.forEach(g => console.log('  ! ' + g)); }
if (semDado.length) console.log(`\nSEM página no wiki (intocados): ${semDado.join(', ')}`);

if (APLICAR) { writeFileSync('src/domain/shopCatalog.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar)');
