// Guarda contra sprite de monstro de HUNT que não resolve no navegador.
//
// O caminho do sprite é derivado do NOME do monstro em bestiary.js
// (monster.name.replace(/ /g,'_') + '.webp', ver infrastructure/tibiaSprites.js).
// No Windows (dev) o sistema de arquivos IGNORA maiúscula/minúscula, então um
// nome "Man-maggot" acha o arquivo "Man-Maggot.webp" numa boa. Mas o GitHub
// Pages serve de Linux (case-SENSITIVE): lá "Man-maggot.webp" dá 404, o <img>
// cai no emoji e o bicho aparece ESTÁTICO — bug que só se vê em produção
// (reportado pelo Felipe: "alguns monstros voltaram a ficar estáticos").
//
// Esta guarda replica a resolução de nome->arquivo e falha se algum monstro de
// zona/boss pedir um arquivo que não existe com a capitalização EXATA.
import { readFileSync, readdirSync } from 'node:fs';

const src = readFileSync('src/domain/bestiary.js', 'utf8');
const dir = 'assets/sprites/monsters';
const files = readdirSync(dir).filter(f => f.endsWith('.webp'));
const exact = new Set(files);
const lower = new Map(files.map(f => [f.toLowerCase(), f]));

// Espelha SPRITE_OVERRIDE de infrastructure/tibiaSprites.js (bosses sem sprite real).
const OVERRIDE = {
  lothlorien: 'Elf_Arcanist', executioner: 'Orc_Warlord', morgul: 'Spectre',
  corrupted_one: 'Blightwalker', nzoth: 'World_Devourer', guardian_of_tales: 'Guardian_Of_Tales',
  shadowthorn: 'Elf', shadowthorn_splinter: 'Elf_Scout', shadowthorn_deceiver: 'Elf_Overseer',
  shadowthorn_templar: 'Elf_Arcanist',
};

const zones = src.slice(src.indexOf('export const ZONES'), src.indexOf('export const MONSTERS'));
const huntIds = new Set();
for (const m of zones.matchAll(/monsters:\s*\[([^\]]*)\]/g)) for (const id of m[1].matchAll(/'([a-z0-9_]+)'/g)) huntIds.add(id[1]);
for (const m of zones.matchAll(/boss:\s*'([a-z0-9_]+)'/g)) huntIds.add(m[1]);

const nameById = {};
const nameRe = new RegExp("^\\s*([a-z0-9_]+):\\s*\\{ name: '((?:[^'\\\\]|\\\\.)*)'", 'gm');
for (const m of src.matchAll(nameRe)) nameById[m[1]] = m[2].replace(/\\'/g, "'");

const caseMismatch = [], missing = [];
for (const id of [...huntIds].sort()) {
  const base = OVERRIDE[id] || (nameById[id] ? nameById[id].replace(/ /g, '_') : null);
  if (!base) continue;
  const f = base + '.webp';
  if (exact.has(f)) continue;
  const real = lower.get(f.toLowerCase());
  if (real) caseMismatch.push(`  ${id}: pede "${f}"  ->  existe como "${real}" (corrija a capitalização do name)`);
  else missing.push(`  ${id}: "${f}" não existe (baixe o sprite ou adicione um SPRITE_OVERRIDE)`);
}

console.log(`monstros de hunt: ${huntIds.size} | mismatch de caixa: ${caseMismatch.length} | faltando: ${missing.length}`);
if (caseMismatch.length || missing.length) {
  if (caseMismatch.length) console.log(`\nCASE MISMATCH (404 no GitHub Pages -> emoji estático):\n${caseMismatch.join('\n')}`);
  if (missing.length) console.log(`\nSPRITE FALTANDO:\n${missing.join('\n')}`);
  console.log('\nRESULTADO: FALHOU');
  process.exit(1);
}
console.log('\nRESULTADO: PASSOU (todo monstro de hunt resolve seu sprite com a caixa exata)');
