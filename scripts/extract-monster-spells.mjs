// Extrai os ATAQUES ELEMENTAIS canônicos (não-melee) dos monstros alcançáveis
// que hoje só têm melee, direto dos .lua do Crystal Server. Converte pro nosso
// formato spells:[{element,min,max}]. READ-ONLY: só imprime a proposta (JSON).
// Uso: node scripts/extract-monster-spells.mjs [--zone=<zoneId>] [--apply]
import { readFileSync, writeFileSync } from 'node:fs';
import { monstroRef, REF_OK } from './cs-ref.mjs';

if (!REF_OK) { console.error('reference/crystalserver não encontrado'); process.exit(2); }

const b = await import('file:///c:/workspace/rubinot-idle/src/domain/bestiary.js');
const { MONSTERS, ZONES } = b;

const ZONE = (process.argv.find(a => a.startsWith('--zone=')) || '').split('=')[1] || null;

// COMBAT_XXXDAMAGE -> nosso elemento. manadrain/drown/etc. que não temos caem fora.
const ELEM = {
  PHYSICALDAMAGE: 'physical', ENERGYDAMAGE: 'energy', EARTHDAMAGE: 'earth',
  FIREDAMAGE: 'fire', ICEDAMAGE: 'ice', DEATHDAMAGE: 'death', HOLYDAMAGE: 'holy',
  LIFEDRAIN: 'death', // lifedrain ~ dano de morte no nosso modelo
};

// extrai o bloco { ... } de um campo top-level (attacks) casando chaves
function bloco(txt, campo) {
  const m = txt.match(new RegExp(campo + '\\s*=\\s*\\{'));
  if (!m) return '';
  let i = m.index + m[0].length, prof = 1;
  const ini = i;
  for (; i < txt.length && prof > 0; i++) { if (txt[i] === '{') prof++; else if (txt[i] === '}') prof--; }
  return txt.slice(ini, i - 1);
}

// separa as entradas { ... } de 1º nível dentro do bloco attacks
function entradas(blocoTxt) {
  const out = []; let prof = 0, ini = -1;
  for (let i = 0; i < blocoTxt.length; i++) {
    const c = blocoTxt[i];
    if (c === '{') { if (prof === 0) ini = i + 1; prof++; }
    else if (c === '}') { prof--; if (prof === 0 && ini >= 0) { out.push(blocoTxt.slice(ini, i)); ini = -1; } }
  }
  return out;
}

const reach = new Set();
for (const [zid, z] of Object.entries(ZONES)) {
  if (ZONE && zid !== ZONE) continue;
  (z.monsters || []).forEach(m => reach.add(m)); if (z.boss) reach.add(z.boss);
}

const proposta = {}; const semFonte = []; const jaTem = [];
for (const id of reach) {
  const m = MONSTERS[id]; if (!m) continue;
  if (Array.isArray(m.spells) && m.spells.length) { jaTem.push(id); continue; }
  const ref = monstroRef(m.name);
  if (!ref) { semFonte.push(`${id} (${m.name})`); continue; }
  const txt = readFileSync(ref.caminho, 'utf8');
  const atk = bloco(txt, 'attacks');
  if (!atk) { semFonte.push(`${id} (sem attacks)`); continue; }
  const spells = [];
  for (const e of entradas(atk)) {
    const nome = (e.match(/name\s*=\s*"([^"]+)"/) || [])[1] || '';
    if (nome === 'melee') continue; // melee básico já é o nosso atk
    const tp = (e.match(/type\s*=\s*COMBAT_(\w+)/) || [])[1];
    const el = tp ? ELEM[tp] : null;
    if (!el) continue; // sem tipo elemental explícito (ou healing/manadrain) → pula (conservador)
    if (/COMBAT_HEALING/.test(e)) continue;
    const mn = Number((e.match(/minDamage\s*=\s*(-?\d+)/) || [])[1]);
    const mx = Number((e.match(/maxDamage\s*=\s*(-?\d+)/) || [])[1]);
    if (!Number.isFinite(mx)) continue;
    spells.push({ element: el, min: Math.abs(Number.isFinite(mn) ? mn : 0), max: Math.abs(mx) });
  }
  if (spells.length) proposta[id] = spells;
}

console.log('alcançáveis analisados:', reach.size, '| já tinham spells:', jaTem.length, '| propostos:', Object.keys(proposta).length, '| sem fonte/attacks:', semFonte.length);
if (semFonte.length) console.log('SEM FONTE:', semFonte.slice(0, 20).join(', '), semFonte.length > 20 ? `… +${semFonte.length-20}` : '');
console.log('\n=== PROPOSTA (id -> spells) ===');
for (const [id, sp] of Object.entries(proposta)) console.log(`  ${id}: ${JSON.stringify(sp)}`);

if (process.argv.includes('--apply')) {
  writeFileSync('scripts/.monster-spells-proposta.json', JSON.stringify(proposta, null, 2));
  console.log('\n[apply] proposta salva em scripts/.monster-spells-proposta.json (aplicação no bestiary é passo separado)');
}
