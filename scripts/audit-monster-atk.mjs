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
const threshArg = process.argv.find(a => a.startsWith('--thresh='));
const THRESH = threshArg ? parseInt(threshArg.split('=')[1], 10) : 3000; // acima disso = suspeito de placeholder

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

// ---- 2. extrai o dano melee MÁX do ataque "melee" de um .lua ----
// Fiel ao Crystal (src/creatures/monsters/monsters.cpp + items/weapons/weapons.cpp):
//   - se o melee tem `maxDamage` explícito -> |maxDamage|
//   - se tem `skill`/`attack` -> getMaxMeleeDamage = ceil(skill*attack*0.05 + attack*0.5)
function meleeFromLine(seg) {
  const maxD = seg.match(/maxDamage\s*=\s*(-?\d+)/);
  if (maxD) return Math.abs(parseInt(maxD[1], 10));
  const skill = seg.match(/\bskill\s*=\s*(\d+)/);
  const attack = seg.match(/\battack\s*=\s*(\d+)/);
  if (skill && attack) {
    const s = parseInt(skill[1], 10), a = parseInt(attack[1], 10);
    return Math.ceil(s * a * 0.05 + a * 0.5); // getMaxMeleeDamage(skill, attack)
  }
  return null;
}
// O jogo tem UM knob de dano (atk). Regra fiel: se o monstro tem melee, o atk é o
// dano melee MÁX (ataque físico principal); se é caster/distance (sem melee), é o
// MAIOR dano dos ataques "combat" (o ataque à distância/spell primário) — assim
// não fica instakill (placeholder) nem inofensivo (zerado).
function meleeMaxFromLua(path) {
  // remove linhas comentadas do Lua (--) pra não ler ataque desativado
  const src = readFileSync(path, 'utf8').split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const meleeLine = src.match(/name\s*=\s*"melee"[^\n]*/);
  if (meleeLine) {
    const m = meleeFromLine(meleeLine[0]);
    if (m == null) return null; // melee sem número nem skill/attack -> revisar
    if (m > 0) return m;
  }
  // sem melee (ou melee 0): pega o maior maxDamage dos ataques "combat"
  let best = 0;
  const re = /name\s*=\s*"combat"[^\n]*?maxDamage\s*=\s*(-?\d+)/g;
  let mm;
  while ((mm = re.exec(src))) best = Math.max(best, Math.abs(parseInt(mm[1], 10)));
  return best; // 0 = sem melee nem combat tabelado (raríssimo)
}

// ---- 3. carrega os monstros do jogo ----
const mod = await import('../src/domain/bestiary.js?v=probe');
const catKey = Object.keys(mod).find(k => mod[k] && typeof mod[k] === 'object' && mod[k].branchy_crawler);
const CAT = mod[catKey];

const corrupt = Object.entries(CAT)
  .filter(([id, d]) => d && typeof d === 'object' && typeof d.atk === 'number' && d.atk > THRESH)
  .sort((a, b) => b[1].atk - a[1].atk);

const fixes = [];    // {id, from, to} — aplicáveis
const noLua = [];    // sem .lua correspondente (custom/evento)
const noMelee = [];  // .lua achado mas sem maxDamage nem skill/attack
const wouldZero = []; // source diz melee=0 (caster/distance) MAS o monstro não
                      // tem spells no jogo -> zerar deixaria inofensivo; pular.

for (const [id, d] of corrupt) {
  const lua = luaFor(id);
  if (!lua) { noLua.push([id, d.atk]); continue; }
  const real = meleeMaxFromLua(lua);
  if (real == null) { noMelee.push([id, d.atk, lua.replace(/\\/g, '/')]); continue; }
  if (real === d.atk) continue;
  const hasSpells = CAT[id].spells && CAT[id].spells.length;
  if (real === 0 && !hasSpells) { wouldZero.push([id, d.atk]); continue; }
  fixes.push({ id, from: d.atk, to: real });
}

console.log(`corrompidos (atk>${THRESH}): ${corrupt.length}`);
console.log(`  com fix da fonte: ${fixes.length}`);
console.log(`  zeraria (caster/distance sem spell no jogo) — pulado: ${wouldZero.length}`);
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
