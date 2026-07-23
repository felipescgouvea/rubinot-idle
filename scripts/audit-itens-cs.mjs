// AUDITORIA DE ATRIBUTOS DE ITEM contra items.xml do Crystal Server (local).
//
// Confere o def (armadura/defesa) e o atk (ataque de arma) dos itens
// ALCANÇÁVEIS — os que caem de monstro de caçada, estão à venda, ou fazem parte
// de um kit. Auditar os ~9700 do catálogo gastaria à toa: o jogador nunca vê a
// maioria. Mapeamento:
//   armor/legs/boots/helmet  -> nosso `def` == items.xml key="armor"
//   shield                   -> nosso `def` == items.xml key="defense"
//   weapon                   -> nosso `atk` == items.xml key="attack"
//
// Uso: node scripts/audit-itens-cs.mjs [--so=id1,id2]
import { ITEMS, STARTER_KITS, GRADUATE_KITS } from '../src/domain/items.js?v=0';
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { itemAtributos, REF_OK } from './cs-ref.mjs';
import { writeFileSync } from 'node:fs';

if (!REF_OK) { console.error('reference/crystalserver ausente'); process.exit(2); }

const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];

// conjunto alcançável
const alcancaveis = new Set();
if (SO) SO.split(',').forEach(id => alcancaveis.add(id));
else {
  const emHunt = new Set();
  for (const z of Object.values(ZONES)) { (z.monsters || []).forEach(m => emHunt.add(m)); if (z.boss) emHunt.add(z.boss); }
  for (const id of emHunt) for (const e of (MONSTERS[id]?.loot || [])) alcancaveis.add(Array.isArray(e) ? e[0] : e);
  for (const it of Object.values(ITEMS)) if (it.sell > 0) {} // venda não implica alcançável; loja é o gate real
  // kits iniciais e de graduação
  for (const kit of [...Object.values(STARTER_KITS || {}), ...Object.values(GRADUATE_KITS || {})])
    Object.values(kit).forEach(v => typeof v === 'string' && alcancaveis.add(v));
}

const TIPO_ARMOR = new Set(['armor', 'legs', 'boots', 'helmet', 'ring']);
const div = { def: [], atk: [] };
const semItem = [];
let conferidos = 0;

const fora = (nosso, real) => real != null && nosso != null && nosso !== real;

for (const id of alcancaveis) {
  const it = ITEMS[id];
  if (!it) continue;
  const ref = itemAtributos(it.name);
  if (!ref) { semItem.push(`${id} ("${it.name}")`); continue; }
  conferidos++;

  if (it.type === 'weapon' && it.atk != null) {
    if (fora(it.atk, ref.attack)) div.atk.push({ id, nome: it.name, nosso: it.atk, real: ref.attack });
  } else if (it.type === 'shield' && it.def != null) {
    if (fora(it.def, ref.defense)) div.def.push({ id, nome: it.name, tipo: 'escudo', nosso: it.def, real: ref.defense });
  } else if (TIPO_ARMOR.has(it.type) && it.def != null) {
    if (fora(it.def, ref.armor)) div.def.push({ id, nome: it.name, tipo: it.type, nosso: it.def, real: ref.armor });
  }
}

const sec = (t, arr, fmt) => {
  console.log(`\n${'='.repeat(72)}\n${t} (${arr.length})\n${'='.repeat(72)}`);
  arr.slice(0, 40).forEach(x => console.log('  ✗ ' + fmt(x)));
  if (arr.length > 40) console.log(`  ... e mais ${arr.length - 40}`);
};

console.log(`itens alcançáveis conferidos: ${conferidos} · sem correspondência no items.xml: ${semItem.length}`);
sec('DEF divergente (armadura/defesa)', div.def, x => `${x.id} (${x.tipo}) "${x.nome}": def ${x.nosso} vs items.xml ${x.real}`);
sec('ATK divergente (ataque de arma)', div.atk, x => `${x.id} "${x.nome}": atk ${x.nosso} vs items.xml ${x.real}`);

writeFileSync('scripts/itens-cs-auditoria.json', JSON.stringify({ ...div, semItem, conferidos }, null, 1));
const total = div.def.length + div.atk.length;
console.log(`\nrelatório em scripts/itens-cs-auditoria.json`);
console.log(total ? `\nRESULTADO: FALHOU — ${total} atributo(s) divergente(s)` : '\nRESULTADO: PASSOU');
if (total) process.exitCode = 1;
