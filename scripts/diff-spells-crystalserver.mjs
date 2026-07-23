// Diff do nosso catálogo de magias contra o do Crystal Server (zimbadev/crystalserver).
//
// Regra do projeto: fórmula/valores de combate seguem o source do Crystal Server, nunca
// memória. Este script baixa data/spells/spells.xml do Crystal Server e compara, magia a
// magia, três coisas objetivas: nível mínimo, custo de mana e vocações.
// Também lista o que existe lá e não existe aqui (o "o que está faltando").
//
// Uso: node scripts/diff-spells-crystal.mjs
import { SPELLS } from '../src/domain/spells.js?v=0';

const RAMO = process.env.TFS_REF || '1.4';   // master já migrou pra Lua e o XML ficou vazio
const URL = `https://raw.githubusercontent.com/zimbadev/crystalserver/${RAMO}/data/spells/spells.xml`;
const VOCS = ['sorcerer', 'druid', 'paladin', 'knight'];

const xml = await fetch(URL).then(r => r.text());
if (!xml.includes('<instant')) throw new Error(`spells.xml vazio em ${RAMO} — o Crystal Server moveu as magias pra Lua nesse ramo`);

// Só o que um JOGADOR conjura: as entradas sem grupo são magias de monstro
// (words "###1") e de casa (aleta grav), não entram na comparação.
const crystal = [];
for (const m of xml.matchAll(/<(instant|rune)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g)) {
  const [, tag, attrs, , inner = ''] = m;
  const at = k => (attrs.match(new RegExp(`${k}="([^"]*)"`)) || [, ''])[1];
  const grupo = at('group');
  if (!grupo || !at('name')) continue;
  const vocs = [...new Set([...inner.matchAll(/<vocation name="([^"]+)"/g)]
    .map(v => v[1].toLowerCase()).filter(v => VOCS.includes(v)))];
  crystal.push({
    tag, grupo, nome: at('name'), words: at('words'),
    level: Number(at('lvl') || at('level') || 0), mana: Number(at('mana') || 0),
    soul: Number(at('soul') || 0),
    // sem <vocation> = liberada pras quatro
    vocs: vocs.length ? vocs.sort() : [...VOCS].sort(),
    conjura: tag === 'instant' && grupo === 'support' && /^(ad|exevo con|exevo infir con|exeta con)/.test(at('words')),
  });
}

// O casamento é pelas PALAVRAS mágicas, não pelo nome: palavra é identidade no
// Tibia (o nome traduzido/apelidado muda, "exori gran ico" não).
const nossasPorWords = new Map(Object.entries(SPELLS).map(([id, s]) => [s.words, { id, ...s }]));
const divergencias = [];
const faltando = { attack: [], healing: [], support: [], conjure: [] };

for (const t of crystal) {
  if (!t.words) continue;                      // runa lançada como item, não como magia
  const nossa = nossasPorWords.get(t.words);
  if (!nossa) {
    (t.conjura ? faltando.conjure : faltando[t.grupo] || (faltando[t.grupo] = [])).push(t);
    continue;
  }
  const d = [];
  if (nossa.level !== t.level) d.push(`nível ${nossa.level} != Crystal Server ${t.level}`);
  if (nossa.mana !== t.mana && t.mana > 0) d.push(`mana ${nossa.mana} != Crystal Server ${t.mana}`);
  const nv = [...nossa.voc].sort().join(',');
  const tv = t.vocs.join(',');
  if (nv !== tv) d.push(`vocações ${nv} != Crystal Server ${tv}`);
  if (d.length) divergencias.push(`${t.nome} ("${t.words}"): ${d.join(' · ')}`);
}

const soNossas = Object.entries(SPELLS)
  .filter(([, s]) => !crystal.some(t => t.words === s.words))
  .map(([id, s]) => `${s.name} ("${s.words}") [${id}]`);

const cab = s => `\n${'='.repeat(70)}\n${s}\n${'='.repeat(70)}`;
console.log(`Crystal Server ${RAMO}: ${crystal.length} magias de jogador · nosso catálogo: ${Object.keys(SPELLS).length}`);

for (const [grupo, lista] of Object.entries(faltando)) {
  if (!lista.length) continue;
  console.log(cab(`FALTANDO — ${grupo} (${lista.length})`));
  lista.sort((a, b) => a.level - b.level).forEach(t => {
    console.log(`  lv${String(t.level).padStart(3)} · ${String(t.mana).padStart(4)} mana`
      + `${t.soul ? ` · ${t.soul} soul` : '        '} · ${t.nome.padEnd(30)} "${t.words}" [${t.vocs.join('/')}]`);
  });
}

console.log(cab(`DIVERGÊNCIAS de nível/mana/vocação (${divergencias.length})`));
divergencias.forEach(d => console.log('  ' + d));

console.log(cab(`SÓ NOSSAS — não existem no Crystal Server ${RAMO} (${soNossas.length})`));
soNossas.forEach(s => console.log('  ' + s));
