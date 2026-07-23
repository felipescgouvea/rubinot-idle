// Troca TODAS as referências de fonte de TFS -> Crystal Server, a pedido do
// Felipe. Crystal Server (zimbadev/crystalserver) é um fork do Canary (linhagem
// TFS) e carrega a MESMA engine de combate + os scripts Lua, então a
// re-atribuição é fiel: as fórmulas citadas existem lá. Também está mais atual
// (é a fonte que tem o Monk). Ver memory: fonte-monk-crystalserver.
//
// Só mexe na família TFS (nome/repo/paths). As 2 referências ao Canary como
// servidor (combatFx.js, prey.js) são trocadas à mão, pra não arriscar o ITEM
// "Canary Feather" nem a linha factual de monk-reference.md ("Canary/TFS ainda
// não têm Monk"). Os paths internos viram o layout REAL do Crystal Server
// (cada um verificado por HTTP 200 no repo).
//
// Uso: node scripts/troca-tfs-crystalserver.mjs [--aplicar]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APLICAR = process.argv.includes('--aplicar');

// Ordem IMPORTA: paths e repo antes dos nomes soltos, pra não picotar.
const TROCAS = [
  [/data\/actions\/scripts\/others\/potions\.lua/g, 'data/scripts/actions/items/potions.lua'],
  [/data\/spells\/scripts\//g, 'data/scripts/spells/'],
  [/data\/weapons\/scripts\//g, 'data/scripts/weapons/scripts/'],
  [/otland\/forgottenserver/g, 'zimbadev/crystalserver'],
  [/\bThe Forgotten Server\b/gi, 'Crystal Server'],
  [/\bforgottenserver\b/g, 'crystalserver'],
  [/\bTFS\b/g, 'Crystal Server'],
];

const IGNORAR = new Set(['scripts/monk-reference.md', 'scripts/troca-tfs-crystalserver.mjs']);

const arquivos = [];
(function varrer(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) varrer(p);
    else if (/\.(js|mjs|md)$/.test(n)) arquivos.push(p.replace(/\\/g, '/'));
  }
})('.');

let totalArq = 0, totalOcc = 0;
const resumo = [];
for (const arq of arquivos) {
  if (IGNORAR.has(arq)) continue;
  let src = readFileSync(arq, 'utf8');
  if (!/TFS|forgottenserver|The Forgotten Server/i.test(src)) continue;

  let occ = 0;
  for (const [re, to] of TROCAS) src = src.replace(re, () => { occ++; return to; });

  if (occ) {
    totalArq++; totalOcc += occ;
    resumo.push(`${arq}: ${occ}`);
    if (APLICAR) writeFileSync(arq, src);
  }
}

console.log(`arquivos alterados: ${totalArq} · ocorrências: ${totalOcc}`);
resumo.forEach(r => console.log('  ~ ' + r));
console.log(APLICAR ? '\nGRAVADO' : '\n(simulação — rode com --aplicar)');
