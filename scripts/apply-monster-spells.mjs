// Aplica a proposta de spells (scripts/.monster-spells-proposta.json) nas linhas
// dos monstros em src/domain/bestiary.js — injeta `spells: [...]` antes do `}` de
// cada definição (single-line). Só toca monstros SEM spells. Escreve UTF-8 sem BOM.
// Uso: node scripts/apply-monster-spells.mjs [--only=id1,id2] [--dry]
import { readFileSync, writeFileSync } from 'node:fs';

const prop = JSON.parse(readFileSync('scripts/.monster-spells-proposta.json', 'utf8'));
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const onlySet = ONLY ? new Set(ONLY.split(',')) : null;
const DRY = process.argv.includes('--dry');

const path = 'src/domain/bestiary.js';
let src = readFileSync(path, 'utf8');
const lines = src.split(/\r?\n/);
let applied = 0, skipped = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // casa "  <id>: { ... }," no começo da linha
  const m = line.match(/^(\s*)([a-z0-9_]+):\s*\{(.*)\},(\s*)$/i);
  if (!m) continue;
  const id = m[2];
  if (!prop[id]) continue;
  if (onlySet && !onlySet.has(id)) continue;
  // SÓ a linha da definição do MONSTRO (tem name+hp+atk). Ignora a ZONA e outras
  // estruturas que reusam o mesmo id (ex.: corym_skirmisher/glooth_bandit também
  // são zonas) — injetar spells nelas corromperia o dado.
  if (!/\bname:\s*['"]/.test(line) || !/\bhp:\s*\d/.test(line) || !/\batk:\s*\d/.test(line)) continue;
  if (/city:|monsters:|worldReq:/.test(line)) continue;
  if (/[,{]\s*spells\s*:/.test(line)) { skipped++; continue; } // já tem spells
  const inner = m[3].replace(/\s+$/, '');
  const spellsJson = JSON.stringify(prop[id]).replace(/"element"/g, 'element').replace(/"min"/g, 'min').replace(/"max"/g, 'max');
  lines[i] = `${m[1]}${id}: {${inner}, spells: ${spellsJson} },${m[4]}`;
  applied++;
}

console.log(`monstros na proposta: ${Object.keys(prop).length} | aplicados: ${applied} | já-tinham/pulados: ${skipped}`);
if (!DRY) { writeFileSync(path, lines.join('\n'), 'utf8'); console.log('bestiary.js atualizado'); }
else console.log('(dry-run: nada escrito)');
