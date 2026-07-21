// Aplica o npcvalue REAL do TibiaWiki no campo `sell` dos itens que dropam nas
// hunts. Entrada: scripts/npcvalues.json (gerado por fetch-npcvalues.mjs).
//
// As linhas de items.js têm PADDING DE ALINHAMENTO (`  wolf_paw:        { ... }`),
// por isso o âncora usa \s* depois dos dois pontos. Use String.raw no padrão —
// escrever o regex como string normal come as barras invertidas.
import { readFileSync, writeFileSync } from 'node:fs';

const nv = JSON.parse(readFileSync('scripts/npcvalues.json', 'utf8'));
let src = readFileSync('src/domain/items.js', 'utf8');

let ok = 0, semValor = 0;
const naoAchou = [];
const mudancas = [];

for (const [id, v] of Object.entries(nv)) {
  if (v.npcvalue == null) { semValor++; continue; }
  const anchor = new RegExp(String.raw`^  ${id}:\s*\{`, 'm');
  const am = anchor.exec(src);
  if (!am) { naoAchou.push(id); continue; }
  const lineEnd = src.indexOf('\n', am.index);
  const line = src.slice(am.index, lineEnd);
  if (!/\bsell:\s*\d/.test(line)) { naoAchou.push(id + '(sem campo sell)'); continue; }
  const nova = line.replace(/(\bsell:\s*)(\d+)/, (_, p, n) => {
    if (+n !== v.npcvalue) mudancas.push([id, +n, v.npcvalue]);
    return p + v.npcvalue;
  });
  src = src.slice(0, am.index) + nova + src.slice(lineEnd);
  ok++;
}

writeFileSync('src/domain/items.js', src);
console.log(`processados: ${ok} | alterados: ${mudancas.length} | sem npcvalue: ${semValor} | nao encontrados: ${naoAchou.length}`);
if (naoAchou.length) console.log('  ->', naoAchou.slice(0, 20).join(', '));
