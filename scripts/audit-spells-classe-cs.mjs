// GAP de spells por VOCAÇÃO contra o Crystal Server.
//
// Pra cada vocação, compara as magias que o source dá (data/scripts/spells/**)
// com as que temos (domain/spells.js), casando por PALAVRAS (a incantação é
// única). Reporta:
//   - FALTANDO: magia que o source dá à vocação e nós não temos (gap real).
//   - VOC ERRADA: magia nossa marcada pra uma vocação que o source NÃO dá a ela.
// Casar por words evita ruído de tradução de nome. Promovido (master sorcerer…)
// conta como a base.
//
// Uso: node scripts/audit-spells-classe-cs.mjs
import { SPELLS } from '../src/domain/spells.js?v=0';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'reference/crystalserver/data/scripts/spells';
const normW = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
const BASE = { 'master sorcerer': 'sorcerer', 'elder druid': 'druid', 'elite knight': 'knight', 'royal paladin': 'paladin', 'exalted monk': 'monk' };

// ---- índice CS: words -> { name, level, group, vocs:Set } ----
const cs = new Map();
(function varre(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) varre(p);
    else if (n.endsWith('.lua')) {
      const txt = readFileSync(p, 'utf8');
      const words = (txt.match(/spell:words\("([^"]+)"\)/) || [])[1];
      if (!words) continue;
      const name = (txt.match(/spell:name\("([^"]+)"\)/) || [])[1] || words;
      const level = Number((txt.match(/spell:level\((\d+)\)/) || [])[1] || 0);
      const group = (txt.match(/spell:group\("([^"]+)"\)/) || [])[1] || '?';
      const vocs = new Set();
      const vm = txt.match(/spell:vocation\(([^)]*)\)/);
      if (vm) for (const q of vm[1].match(/"([^";]+)/g) || []) {
        const v = q.slice(1).trim();
        vocs.add(BASE[v] || v);
      }
      cs.set(normW(words), { name, level, group, vocs });
    }
  }
})(RAIZ);

// ---- nossas magias por words ----
const nossoPorWords = new Map();
for (const [id, s] of Object.entries(SPELLS)) nossoPorWords.set(normW(s.words), { id, ...s });

const VOCS = ['knight', 'paladin', 'sorcerer', 'druid', 'monk'];
const relatorio = {};

// Nosso teto é nível 100 (XP_TABLE) — magia acima disso é inalcançável.
const CAP = 100;
// Utilidade de MMO que não existe num idle: casa, localizar boss, invocar
// familiar/avatar. Não é gap de conteúdo — é feature que o jogo simplesmente
// não tem. Filtradas por prefixo de palavra.
const IRRELEVANTE = w =>
  /^aleta |^alana /.test(w) ||          // listas/porta de casa
  w === 'exiva moe res' ||               // Find Fiend
  /^utevo gran res /.test(w) ||          // familiars
  /^uteta res /.test(w);                 // avatars (uteta res <elem>)

for (const v of VOCS) {
  const faltando = [], vocErrada = [];
  // magias que o CS dá a esta vocação
  for (const [w, info] of cs) {
    if (!info.vocs.has(v)) continue;
    if (info.level > CAP || IRRELEVANTE(w)) continue;
    const nosso = nossoPorWords.get(w);
    if (!nosso) faltando.push(`${info.name} ("${w}") lv${info.level} [${info.group}]`);
    else if (!nosso.voc.includes(v)) vocErrada.push(`${info.name} ("${w}") — temos, mas não liberada pro ${v}`);
  }
  // nossas magias marcadas pra vocação que o CS NÃO dá
  const extra = [];
  for (const [w, s] of nossoPorWords) {
    if (!s.voc.includes(v)) continue;
    const info = cs.get(w);
    if (info && !info.vocs.has(v)) extra.push(`${s.name} ("${w}") — nós damos pro ${v}, CS dá só pra [${[...info.vocs].join(',')}]`);
  }
  relatorio[v] = { faltando, vocErrada, extra };
}

let totalGap = 0;
for (const v of VOCS) {
  const r = relatorio[v];
  const n = r.faltando.length + r.vocErrada.length + r.extra.length;
  totalGap += r.faltando.length + r.vocErrada.length;
  console.log(`\n${'='.repeat(70)}\n${v.toUpperCase()}  — faltando ${r.faltando.length} · voc errada ${r.vocErrada.length} · extra ${r.extra.length}\n${'='.repeat(70)}`);
  r.faltando.slice(0, 25).forEach(x => console.log('  ✗ FALTA  ' + x));
  if (r.faltando.length > 25) console.log(`  ... +${r.faltando.length - 25}`);
  r.vocErrada.slice(0, 10).forEach(x => console.log('  ⚠ TRAVADA ' + x));
  r.extra.slice(0, 10).forEach(x => console.log('  ? EXTRA  ' + x));
}

console.log(`\nCS spells indexados: ${cs.size} · nossos: ${nossoPorWords.size}`);
console.log(`\nRESULTADO: ${totalGap ? 'FALHOU — ' + totalGap + ' gap(s) de spell (faltando/travada)' : 'PASSOU'}`);
