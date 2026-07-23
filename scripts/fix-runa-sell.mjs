// CORRIGE o valor de VENDA das runas pro npcvalue REAL do TibiaWiki.
//
// Runa não é vendável a NPC no Tibia (npcvalue 0) — mas nosso catálogo dá 70-200
// pra elas, o que criou o quase-exploit da loja. Aqui NÃO se assume 0 no escuro:
// busca o npcvalue de cada runa na página "(Item)" e grava o que a fonte diz.
//
// A página do NOME da runa é o FEITIÇO (Infobox Spell, sem npcvalue); o item
// está em "<Nome> (Item)". Resolve os dois.
//
// Uso: node scripts/fix-runa-sell.mjs [--aplicar]
import { ITEMS } from '../src/domain/items.js?v=0';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const APLICAR = process.argv.includes('--aplicar');
const runas = Object.entries(ITEMS).filter(([, it]) => it.type === 'rune' && (it.sell || 0) > 0);

const cacheTxt = nome => {
  const f = 'scripts/.wiki-cache/' + nome.replace(/ /g, '_') + '.txt';
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};
const fetchTxt = titulo => {
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&redirects=1&titles=' + encodeURIComponent(titulo);
  try {
    const json = JSON.parse(execFileSync('curl', ['-s', '-m', '60', url], { maxBuffer: 1 << 28 }).toString());
    const p = Object.values(json.query?.pages || {})[0];
    return p?.revisions?.[0]?.slots?.main?.['*'] || null;
  } catch { return null; }
};
const npcvalueDe = nome => {
  let txt = cacheTxt(nome) || fetchTxt(nome);
  if (txt && !/npcvalue/i.test(txt) && /Infobox Spell/i.test(txt)) {
    const alt = fetchTxt(nome + ' (Item)');
    if (alt) txt = alt;
  }
  if (!txt || !/npcvalue/i.test(txt)) return null;
  return Number((txt.match(/npcvalue\s*=\s*(\d+)/i) || [])[1] || 0);
};

let src = readFileSync('src/domain/items.js', 'utf8');
const feitos = [], semDado = [];

for (const [id, it] of runas) {
  const real = npcvalueDe(it.name);
  if (real == null) { semDado.push(`${id} ("${it.name}")`); continue; }
  if (real === it.sell) continue;
  const marca = '\n  ' + id + ':';
  const pos = src.indexOf(marca);
  if (pos < 0) { semDado.push(`${id} (linha não achada)`); continue; }
  const fim = src.indexOf('\n', pos + 1);
  const linha = src.slice(pos + 1, fim);
  const nova = linha.replace(/(\bsell:\s*)\d+/, '$1' + real);
  if (nova !== linha) { src = src.slice(0, pos + 1) + nova + src.slice(fim); feitos.push(`${id}: ${it.sell} -> ${real}`); }
}

console.log(`runas com sell>0: ${runas.length} · corrigidas: ${feitos.length} · sem dado: ${semDado.length}`);
feitos.slice(0, 40).forEach(l => console.log('  ~ ' + l));
if (semDado.length) console.log('sem dado:', semDado.join(', '));
if (APLICAR) { writeFileSync('src/domain/items.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar)');
