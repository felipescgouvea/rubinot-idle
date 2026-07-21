// Aplica correções de loot vindas da auditoria do TibiaWiki.
// Entrada: scripts/loot-audit.txt, uma linha por monstro:
//   monster_id | Item Name:rarity, Item Name:rarity, ...
// Converte nome do Tibia -> id do jogo (snake_case) e raridade -> chance,
// e reescreve o array `loot:` daquele monstro em src/domain/bestiary.js.
// Só usa itens que EXISTEM em ITEMS (o resto é reportado e ignorado).
import { readFileSync, writeFileSync } from 'node:fs';

const RARITY = {
  'always': 1.0, 'common': 0.25, 'uncommon': 0.10,
  'semi-rare': 0.04, 'semirare': 0.04, 'rare': 0.01, 'very rare': 0.002, 'veryrare': 0.002,
};

const LOWER = new Set(['of', 'the', 'and', 'a']);
function nameToId(name) {
  return name.trim().toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const { ITEMS } = await import('../src/domain/items.js?v=audit');
const validIds = new Set(Object.keys(ITEMS));
// índice auxiliar: nome exibido (lower) -> id, pra pegar casos que o snake_case erra
const byName = new Map();
for (const [id, it] of Object.entries(ITEMS)) {
  if (it && it.name) byName.set(it.name.toLowerCase(), id);
}

const lines = readFileSync('scripts/loot-audit.txt', 'utf8').split('\n')
  .map(l => l.trim()).filter(l => l && l.includes('|'));

let src = readFileSync('src/domain/bestiary.js', 'utf8');
const missing = new Map();          // item nao encontrado -> monstros
let applied = 0, notfound = 0, skipped = 0;

for (const line of lines) {
  const [rawId, rest] = line.split('|');
  const mid = rawId.trim();
  const body = (rest || '').trim();
  if (!body || /^NOT_FOUND$/i.test(body)) { notfound++; continue; }

  const entries = [];
  for (const part of body.split(',')) {
    const m = part.trim().match(/^(.+):([a-z\- ]+)$/i);
    if (!m) continue;
    const itemName = m[1].trim();
    const rarity = m[2].trim().toLowerCase();
    const chance = RARITY[rarity];
    if (chance == null) continue;
    let id = byName.get(itemName.toLowerCase()) || nameToId(itemName);
    if (!validIds.has(id)) {
      const key = itemName;
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(mid);
      continue;
    }
    if (/^gold_coin$|^platinum_coin$|^crystal_coin$/.test(id)) continue; // moeda é tratada à parte
    entries.push([id, chance]);
  }
  if (!entries.length) { skipped++; continue; }

  // dedup mantendo a maior chance
  const best = new Map();
  for (const [id, c] of entries) best.set(id, Math.max(best.get(id) || 0, c));
  const arr = '[' + [...best.entries()].map(([id, c]) => `['${id}',${c}]`).join(',') + ']';

  // substitui o loot: [...] daquele monstro.
  // O array é ANINHADO ([['a',0.1],['b',0.2]]) — regex não-guloso pararia no
  // primeiro ']' e corromperia o arquivo. Então acha o '[' e casa o ']' dele
  // contando a profundidade.
  const anchor = new RegExp(`^  ${mid}:\\s*\\{`, 'm');   // linhas têm padding de alinhamento
  const am = anchor.exec(src);
  if (!am) { skipped++; continue; }
  const lootAt = src.indexOf('loot: [', am.index);
  const lineEnd = src.indexOf('\n', am.index);
  if (lootAt === -1 || lootAt > lineEnd) { skipped++; continue; }
  const open = lootAt + 'loot: '.length;
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) { skipped++; continue; }
  src = src.slice(0, open) + arr + src.slice(end + 1);
  applied++;
}

writeFileSync('src/domain/bestiary.js', src);
console.log(`loot aplicado: ${applied} monstros | NOT_FOUND: ${notfound} | pulados: ${skipped}`);
if (missing.size) {
  console.log(`\nitens SEM id no jogo (${missing.size}) — ignorados:`);
  [...missing.entries()].slice(0, 40).forEach(([n, ms]) => console.log(`  ${n}  (${ms.slice(0, 3).join(',')})`));
}
