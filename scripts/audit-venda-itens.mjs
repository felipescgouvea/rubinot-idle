// AUDITORIA DO VALOR DE VENDA dos itens contra o `npcvalue` do TibiaWiki.
//
// Apareceu sozinha ao corrigir o loot: a checagem de economia SUBIU (8 -> 12)
// depois que os monstros passaram a dropar o loot certo. O problema não era o
// loot desses casos — era o preço. Amostra que motivou:
//
//   Swampling Club   7626  vs      40   (190x)
//   Brass Shield     2250  vs      25   (90x)
//   Dwarven Shield   3960  vs     100   (40x)
//   Ancient Shield  11000  vs     900   (12x)
//   Tower Shield     8000  vs    8000   (ok)
//
// Escopo: itens ALCANÇÁVEIS — que caem de monstro de caçada ou estão à venda.
// Auditar 9000 itens do catálogo gastaria rede sem proteger ninguém, porque o
// jogador nunca vê a maioria.
//
// Uso: node scripts/audit-venda-itens.mjs [--so=id1,id2]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { paginaWiki, numero } from './wiki-cache.mjs';
import { writeFileSync } from 'node:fs';

const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];

const alcancaveis = new Set();
if (SO) SO.split(',').forEach(id => alcancaveis.add(id));
else {
  const emHunt = new Set();
  for (const z of Object.values(ZONES)) {
    (z.monsters || []).forEach(m => emHunt.add(m));
    if (z.boss) emHunt.add(z.boss);
  }
  for (const id of emHunt) {
    for (const e of (MONSTERS[id]?.loot || [])) alcancaveis.add(Array.isArray(e) ? e[0] : e);
  }
}
const alvos = [...alcancaveis].filter(id => ITEMS[id] && ITEMS[id].sell > 0);

const divergentes = [], semValor = [], semPagina = [];
let conferidos = 0;

for (const [i, id] of alvos.entries()) {
  const it = ITEMS[id];
  const txt = await paginaWiki(it.name);
  if (!txt || !/\{\{Infobox Object/i.test(txt)) { semPagina.push(`${id} ("${it.name}")`); continue; }
  const real = numero(txt, 'npcvalue');
  if (real == null) { semValor.push(`${id} ("${it.name}") — wiki sem npcvalue`); continue; }
  conferidos++;
  // Tolera 10%: o npcvalue varia por NPC/cidade no Tibia. Acima disso é outra
  // ordem de grandeza, não arredondamento.
  if (Math.abs(it.sell - real) > Math.max(1, real * 0.1)) {
    divergentes.push({ id, nome: it.name, nosso: it.sell, real, razao: real ? it.sell / real : Infinity });
  }
  if ((i + 1) % 30 === 0) console.log(`  ... ${i + 1}/${alvos.length}`);
}

divergentes.sort((a, b) => b.razao - a.razao);
console.log(`\nitens alcançáveis com preço: ${alvos.length} · conferidos: ${conferidos}`);
console.log(`\n${'='.repeat(74)}\nVENDA divergente do npcvalue do wiki (${divergentes.length})\n${'='.repeat(74)}`);
divergentes.slice(0, 50).forEach(d =>
  console.log(`  ✗ ${d.id.padEnd(28)} ${String(d.nosso).padStart(7)} vs ${String(d.real).padStart(7)}  (${d.razao.toFixed(1)}x)`));
if (divergentes.length > 50) console.log(`  ... e mais ${divergentes.length - 50}`);
console.log(`\nsem npcvalue no wiki: ${semValor.length} · sem página de item: ${semPagina.length}`);

writeFileSync('scripts/venda-auditoria.json', JSON.stringify({ divergentes, semValor, semPagina, conferidos }, null, 1));
console.log('\nrelatório em scripts/venda-auditoria.json');
console.log(divergentes.length ? `\nRESULTADO: FALHOU — ${divergentes.length} preço(s) divergente(s)` : '\nRESULTADO: PASSOU');
if (divergentes.length) process.exitCode = 1;
