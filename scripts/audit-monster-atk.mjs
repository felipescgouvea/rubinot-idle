// Audita o campo `atk` (dano melee MÁX) dos monstros contra o valor REAL do
// Crystal Server (reference/crystalserver). O `atk` do jogo = |maxDamage| do
// ataque "melee" no .lua da criatura. Vários monstros de endgame têm `atk`
// placeholder gigante (85106, 181934, 266009...) — dano melee impossível que
// instakilla o jogador. Este script acha o valor certo na fonte.
//
// Uso: node scripts/audit-monster-atk.mjs            (dry-run: só relatório)
//      node scripts/audit-monster-atk.mjs --write     (grava correções via patch)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const REF = 'reference/crystalserver';
const WRITE = process.argv.includes('--write');
const THRESH = 3000; // nenhum melee real do Tibia passa disso; acima = placeholder

// normaliza nome de arquivo/monstro pra casar apesar de apóstrofo/hífen/espaço:
// "druid's_apparition" -> "druids_apparition"; "rotten_man-maggot" -> "rotten_man_maggot"
const norm = s => s.toLowerCase().replace(/'/g, '').replace(/[-\s]+/g, '_').replace(/_+/g, '_');

// Aliases: id do jogo -> nome-base do .lua no reference (variantes/renomeados).
const ALIAS = {
  bloodjaw: 'elder_bloodjaw',
  furious_morshabaal: 'morshabaal', enraged_morshabaal: 'morshabaal',
};

// ---- 1. índice de todos os .lua de monstro do reference (chave normalizada -> path) ----
function findLuas(dir, acc) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) findLuas(p, acc);
    else if (e.name.endsWith('.lua')) {
      const key = norm(basename(e.name, '.lua'));
      // prefere data-global (canônico) sobre data-crystal
      if (!acc.has(key) || p.includes('data-global')) acc.set(key, p);
    }
  }
  return acc;
}
const luaIndex = findLuas(join(REF, 'data-global', 'monster'), new Map());
findLuas(join(REF, 'data-crystal', 'monster'), luaIndex);
const luaFor = id => luaIndex.get(norm(ALIAS[id] || id));

// ---- 2. extrai o maxDamage do ataque "melee" de um .lua ----
function meleeMaxFromLua(path) {
  const src = readFileSync(path, 'utf8');
  // linha do tipo: { name = "melee", ... maxDamage = -950 }
  const m = src.match(/name\s*=\s*"melee"[^}]*maxDamage\s*=\s*(-?\d+)/);
  if (m) return Math.abs(parseInt(m[1], 10));
  // alguns usam skill/attack em vez de maxDamage explícito -> sem melee tabelado
  const hasMelee = /name\s*=\s*"melee"/.test(src);
  return hasMelee ? null : 0; // null = melee sem número; 0 = sem melee
}

// ---- 3. carrega os monstros do jogo ----
const mod = await import('../src/domain/bestiary.js?v=probe');
const catKey = Object.keys(mod).find(k => mod[k] && typeof mod[k] === 'object' && mod[k].branchy_crawler);
const CAT = mod[catKey];

const corrupt = Object.entries(CAT)
  .filter(([id, d]) => d && typeof d === 'object' && typeof d.atk === 'number' && d.atk > THRESH)
  .sort((a, b) => b[1].atk - a[1].atk);

const fixes = [];   // {id, from, to}
const noLua = [];   // sem .lua correspondente
const noMelee = []; // .lua achado mas sem maxDamage de melee tabelado

for (const [id, d] of corrupt) {
  const lua = luaFor(id);
  if (!lua) { noLua.push([id, d.atk]); continue; }
  const real = meleeMaxFromLua(lua);
  if (real == null) { noMelee.push([id, d.atk, lua.replace(/\\/g, '/')]); continue; }
  if (real !== d.atk) fixes.push({ id, from: d.atk, to: real });
}

console.log(`corrompidos (atk>${THRESH}): ${corrupt.length}`);
console.log(`  com fix da fonte: ${fixes.length}`);
console.log(`  sem .lua no reference: ${noLua.length}`);
console.log(`  .lua sem melee tabelado: ${noMelee.length}`);

console.log('\n--- FIXES (id: placeholder -> real) ---');
for (const f of fixes.slice(0, 400)) console.log(`  ${f.id}: ${f.from} -> ${f.to}`);
if (noLua.length) { console.log('\n--- SEM LUA (revisar à mão) ---'); for (const [id, a] of noLua) console.log(`  ${id} (atk ${a})`); }
if (noMelee.length) { console.log('\n--- MELEE SEM NÚMERO (skill-based, revisar) ---'); for (const [id, a, l] of noMelee) console.log(`  ${id} (atk ${a}) <- ${l}`); }

if (WRITE && fixes.length) {
  // patch cirúrgico: troca só o "atk: N" da linha do monstro (id: { ... atk: N ... })
  const file = 'src/domain/bestiary.js';
  let src = readFileSync(file, 'utf8');
  let applied = 0;
  for (const f of fixes) {
    // encontra a def do monstro: `  id: { ... }` e troca o primeiro atk: dentro dela
    const re = new RegExp(`(\\b${f.id}:\\s*\\{[^\\n]*?atk:\\s*)${f.from}\\b`);
    if (re.test(src)) { src = src.replace(re, `$1${f.to}`); applied++; }
    else console.log(`  ⚠ não casou no patch: ${f.id}`);
  }
  writeFileSync(file, src);
  console.log(`\ngravadas ${applied}/${fixes.length} correções em ${file}`);
}
