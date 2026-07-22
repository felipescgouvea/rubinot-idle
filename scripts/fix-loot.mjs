// CORRIGE loot e gold dos monstros de caçada a partir do TibiaWiki.
//
// Reescreve, em domain/bestiary.js, os campos `gold:` e `loot:` de cada
// monstro com a tabela REAL. Não é "ajuste": é substituição pela fonte, porque
// a auditoria mostrou 92 itens que o monstro simplesmente não dropa no Tibia.
//
// Regras que este script NÃO quebra:
//  - Item do wiki que não existe no nosso catálogo é REPORTADO, não inventado.
//  - Monstro sem página de criatura no wiki fica INTOCADO (pode ser criatura de
//    RubinOT que não existe no Tibia global — decidir com a fonte certa).
//  - Chance vem da raridade declarada no wiki, por uma tabela documentada
//    (ver wiki-cache.mjs: CHANCE_POR_RARIDADE), nunca de estimativa por item.
//
// Uso:
//   node scripts/fix-loot.mjs            (só mostra o que faria)
//   node scripts/fix-loot.mjs --aplicar  (grava)
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { paginaWiki, lootWiki, chanceDe } from './wiki-cache.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const APLICAR = process.argv.includes('--aplicar');
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// nome do item -> id do nosso catálogo
const idPorNome = new Map();
for (const [id, it] of Object.entries(ITEMS)) {
  const k = norm(it.name);
  if (!idPorNome.has(k)) idPorNome.set(k, id);
}

const emHunt = new Set();
for (const z of Object.values(ZONES)) {
  (z.monsters || []).forEach(m => emHunt.add(m));
  if (z.boss) emHunt.add(z.boss);
}
const alvos = SO ? SO.split(',').filter(id => MONSTERS[id]) : [...emHunt].filter(id => MONSTERS[id]);

let src = readFileSync('src/domain/bestiary.js', 'utf8');
const semCatalogo = new Map();   // item do wiki que não temos
const intocados = [], alterados = [];

for (const id of alvos) {
  const m = MONSTERS[id];
  const txt = await paginaWiki(m.name);
  if (!txt || !/\{\{Infobox Creature/i.test(txt)) { intocados.push(`${id} (sem página de criatura)`); continue; }

  const { itens, gold } = lootWiki(txt);
  const novoLoot = [];
  for (const it of itens) {
    const itemId = idPorNome.get(norm(it.nome));
    if (!itemId) {
      if (!semCatalogo.has(it.nome)) semCatalogo.set(it.nome, []);
      semCatalogo.get(it.nome).push(id);
      continue;
    }
    if (novoLoot.some(([x]) => x === itemId)) continue;
    novoLoot.push([itemId, chanceDe(it.raridade)]);
  }

  // Distinção que faltava, e que muda o resultado de 18 monstros:
  //   - campo `loot` AUSENTE  -> não sabemos, não mexe.
  //   - `{{Loot Table}}` VAZIA -> a fonte diz que o bicho NÃO DROPA NADA.
  // Snake, Slime e Monk's Apparition têm a tabela presente e vazia; tratá-las
  // como "desconhecido" deixava loot inventado no jogo (Meat e Bones num Snake,
  // e 14 itens caros numa Monk's Apparition) sob a desculpa de cautela.
  const temCampoLoot = /\|\s*loot\s*=/i.test(txt);
  const tabelaVazia = temCampoLoot && !itens.length && !gold;
  if (!temCampoLoot) { intocados.push(`${id} (wiki sem campo de loot)`); continue; }
  if (tabelaVazia && (m.loot || []).length === 0) { continue; }

  const lootTxt = '[' + novoLoot.map(([i, c]) => `['${i}',${c}]`).join(',') + ']';
  const goldTxt = gold ? `[${gold[0]},${gold[1]}]` : null;

  // Substitui APENAS dentro da linha deste monstro. Regex global no arquivo
  // inteiro é como se corrompe um catálogo de 2254 entradas.
  const re = new RegExp(`^(\\s*${id}:\\s*\\{.*)$`, 'm');
  const linha = src.match(re);
  if (!linha) { intocados.push(`${id} (linha não encontrada)`); continue; }
  let nova = linha[1];
  if (goldTxt) nova = nova.replace(/gold:\s*\[[^\]]*\]/, `gold: ${goldTxt}`);
  if (/loot:\s*\[/.test(nova)) {
    // loot pode conter arrays aninhados — casa até o fecho equilibrado.
    const i0 = nova.indexOf('loot:');
    let i = nova.indexOf('[', i0), prof = 0, fim = -1;
    for (let k = i; k < nova.length; k++) {
      if (nova[k] === '[') prof++;
      else if (nova[k] === ']') { prof--; if (prof === 0) { fim = k; break; } }
    }
    if (fim < 0) { intocados.push(`${id} (loot com colchetes desbalanceados)`); continue; }
    nova = nova.slice(0, i) + lootTxt + nova.slice(fim + 1);
  } else {
    intocados.push(`${id} (sem campo loot)`); continue;
  }
  if (nova !== linha[1]) {
    src = src.replace(re, nova.replace(/\$/g, '$$$$'));
    alterados.push(`${id}: ${(m.loot || []).length} -> ${novoLoot.length} itens · gold ${JSON.stringify(m.gold)} -> ${goldTxt || '(mantido)'}`);
  }
}

console.log(`monstros alvo: ${alvos.length} · alterados: ${alterados.length} · intocados: ${intocados.length}`);
alterados.slice(0, 40).forEach(l => console.log('  ~ ' + l));
if (alterados.length > 40) console.log(`  ... e mais ${alterados.length - 40}`);
console.log(`\nINTOCADOS (${intocados.length}):`);
intocados.slice(0, 20).forEach(l => console.log('  · ' + l));
console.log(`\nITENS DO WIKI QUE NÃO TEMOS NO CATÁLOGO (${semCatalogo.size}) — reportados, não inventados:`);
[...semCatalogo.entries()].slice(0, 30).forEach(([n, ms]) => console.log(`  · ${n}  (${ms.length} monstro(s))`));

if (APLICAR) {
  writeFileSync('src/domain/bestiary.js', src);
  console.log('\nGRAVADO em src/domain/bestiary.js');
} else {
  console.log('\n(simulação — rode com --aplicar para gravar)');
}
