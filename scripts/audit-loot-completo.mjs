// AUDITORIA COMPLETA DE LOOT — todos os monstros de caçada contra o TibiaWiki.
//
// Motivo (Felipe): um Carrion Worm (70 XP) largou 229 gold + Life Crystal +
// Crystal Coin. Nenhum dos três existe no loot real: o bicho dropa 0-45 gold,
// Carrion Worm Fang, Meat, Worm e Coal. A tabela inteira era inventada.
//
// A auditoria anterior conferia NOMES de item. Esta confere também os VALORES,
// porque foi na CHANCE que o erro grave passou: Crystal Coin vale 10.000 gold e
// estava a 5% num bicho de 70 XP — um a cada vinte kills paga mais que horas de
// caçada. Isso quebra a economia, não é detalhe de fidelidade.
//
// Três classes de achado:
//   INVENTADO   — item que o monstro não dropa no Tibia
//   GOLD        — faixa de gold divergente do wiki
//   ECONOMIA    — item caro demais para a XP do monstro (mesmo que exista)
//
// Uso: node scripts/audit-loot-completo.mjs [--limite=N]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { writeFileSync } from 'node:fs';

const LIMITE = Number((process.argv.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || Infinity;

// Só o que o jogador encontra numa caçada — o catálogo tem 2254 monstros, mas
// auditar bicho que nunca aparece é gastar tempo sem proteger ninguém.
const emHunt = new Set();
for (const z of Object.values(ZONES)) {
  (z.monsters || []).forEach(m => emHunt.add(m));
  if (z.boss) emHunt.add(z.boss);
}
// --so=id1,id2 audita monstros específicos. Existe pra AUTO-TESTE: apontar a
// auditoria num caso sabidamente errado (carrion_worm) e exigir que ela acuse.
// Sem isso, "0 problemas" pode significar tanto jogo limpo quanto parser morto.
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];
const alvos = SO
  ? SO.split(',').filter(id => MONSTERS[id])
  : [...emHunt].filter(id => MONSTERS[id]).slice(0, LIMITE);

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

async function wiki(nome) {
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles='
    + encodeURIComponent(nome);
  for (let tent = 0; tent < 3; tent++) {
    try {
      const j = await fetch(url).then(r => r.json());
      const pages = j && j.query && j.query.pages;
      if (!pages) return null;
      const k = Object.keys(pages)[0];
      if (k === '-1' || !pages[k].revisions) return null;
      return pages[k].revisions[0]['*'];
    } catch { await new Promise(r => setTimeout(r, 800)); }
  }
  return null;
}

// Extrai do wiki: itens do Loot Table, faixa de gold e XP.
function parseWiki(txt) {
  if (!/\{\{Infobox Creature/i.test(txt)) return null;
  const xp = (txt.match(/\|\s*exp\s*=\s*(\d+)/i) || [])[1];
  const itens = [];
  let gold = null;
  for (const m of txt.matchAll(/\{\{Loot Item\|([^}]*)\}\}/gi)) {
    const partes = m[1].split('|').map(x => x.trim()).filter(Boolean);
    // formatos: {{Loot Item|Nome}} · {{Loot Item|0-45|Nome|common}}
    const qtd = /^\d+(-\d+)?$/.test(partes[0]) ? partes.shift() : null;
    const nome = partes[0];
    if (!nome) continue;
    if (/^gold coin$/i.test(nome)) {
      const f = (qtd || '0').split('-');
      gold = [Number(f[0]) || 0, Number(f[1] != null ? f[1] : f[0]) || 0];
    }
    itens.push(nome);
  }
  return { itens, gold, xp: xp ? Number(xp) : null };
}

// Um item vale "caro demais" quando o preço de venda supera muito o que o
// monstro paga em XP. Não é regra do Tibia: é uma rede contra drop absurdo,
// como Crystal Coin (10.000) num bicho de 70 XP.
const VALOR_POR_XP = 40;

const inventados = [], goldRuim = [], economia = [], semPagina = [], conferidos = [];

for (const [i, id] of alvos.entries()) {
  const m = MONSTERS[id];
  const txt = await wiki(m.name);
  if (!txt) { semPagina.push(`${id} ("${m.name}")`); continue; }
  const w = parseWiki(txt);
  if (!w) { semPagina.push(`${id} ("${m.name}") — página não é de criatura`); continue; }
  conferidos.push(id);

  const reais = new Set(w.itens.map(norm));
  for (const entrada of (m.loot || [])) {
    const itemId = Array.isArray(entrada) ? entrada[0] : entrada;
    const chance = Array.isArray(entrada) ? entrada[1] : null;
    const item = ITEMS[itemId];
    if (!item) { inventados.push(`${id}: item "${itemId}" NÃO EXISTE no catálogo`); continue; }
    if (!reais.has(norm(item.name))) {
      inventados.push(`${id} (${m.xp}xp): "${item.name}" não está no loot real${chance != null ? ` (chance ${(chance * 100).toFixed(1)}%)` : ''}`);
    }
    const venda = item.sell || 0;
    if (venda > (m.xp || 1) * VALOR_POR_XP) {
      economia.push(`${id} (${m.xp}xp): "${item.name}" vale ${venda}g a ${chance != null ? (chance * 100).toFixed(1) + '%' : '?'} — ${Math.round(venda / Math.max(1, m.xp))}x a XP do bicho`);
    }
  }

  if (w.gold && Array.isArray(m.gold)) {
    const [wa, wb] = w.gold, [na, nb] = m.gold;
    // Tolera diferença pequena; acusa faixa em outra ordem de grandeza.
    if (nb > wb * 2 + 10 || na > wb + 10) {
      goldRuim.push(`${id} (${m.xp}xp): gold ${na}-${nb} vs wiki ${wa}-${wb}`);
    }
  }
  if ((i + 1) % 25 === 0) console.log(`  ... ${i + 1}/${alvos.length}`);
}

const secao = (t, arr) => {
  console.log(`\n${'='.repeat(74)}\n${t} (${arr.length})\n${'='.repeat(74)}`);
  arr.slice(0, 60).forEach(l => console.log('  ✗ ' + l));
  if (arr.length > 60) console.log(`  ... e mais ${arr.length - 60}`);
};

console.log(`\nmonstros de caçada: ${alvos.length} · conferidos no wiki: ${conferidos.length}`);
secao('LOOT INVENTADO — item que o monstro NÃO dropa no Tibia', inventados);
secao('GOLD divergente do wiki', goldRuim);
secao('ECONOMIA — item caro demais para a XP do monstro', economia);
secao('SEM PÁGINA no wiki (não deu pra conferir)', semPagina);

writeFileSync('scripts/loot-auditoria.json', JSON.stringify({ inventados, goldRuim, economia, semPagina, conferidos }, null, 1));
console.log('\nrelatório completo em scripts/loot-auditoria.json');
const total = inventados.length + goldRuim.length + economia.length;
console.log(total ? `\nRESULTADO: FALHOU — ${total} problema(s) de loot` : '\nRESULTADO: PASSOU');
if (total) process.exitCode = 1;
