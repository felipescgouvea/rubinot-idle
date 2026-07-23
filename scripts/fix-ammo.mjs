// Corrige o catálogo de MUNIÇÃO contra o Tibia atual.
//
// Referência: zimbadev/crystalserver (data/items/items.xml) pro ataque e o
// elemento — é o servidor que acompanha o Tibia 13/14. O nível mínimo vem de
// zimbadev/crystalserver 1.4 (data/weapons/weapons.xml), que é onde essa trava
// está escrita, complementado pelo TibiaWiki pras munições criadas depois.
//
// O que faz:
//   - remove munição INVENTADA (as variantes "_weak", os crystalline por
//     elemento e a power arrow, que não existem no jogo)
//   - acerta ataque e elemento pelos valores atuais
//   - coloca o nível mínimo, que não existia em nenhuma munição
//   - marca a área da Burst Arrow (explode em 3x3, não é alvo único)
//
// Uso: node scripts/fix-ammo.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ARQ = 'src/domain/items.js';

// Não existem no Tibia. Nenhuma aparece em loot de monstro nem na loja; a
// única citada em algum lugar era simple_arrow_weak, no kit inicial, que passa
// a apontar pra simple_arrow de verdade.
const INVENTADAS = [
  'arrow_weak', 'bolt_weak', 'burst_arrow_weak', 'piercing_bolt_weak',
  'power_bolt_weak', 'simple_arrow_weak', 'sniper_arrow_weak',
  'crystalline_arrow_earth', 'crystalline_arrow_energy',
  'crystalline_arrow_fire', 'crystalline_arrow_ice', 'power_arrow',
];

// id -> { atk, reqLevel, element? , area? }
const REAIS = {
  arrow:              { atk: 25, reqLevel: 0 },
  bolt:               { atk: 30, reqLevel: 0 },
  poison_arrow:       { atk: 23, reqLevel: 0 },
  // Burst Arrow explode: createCombatArea 3x3 em data/scripts/weapons/scripts/burst_arrow.lua.
  burst_arrow:        { atk: 27, reqLevel: 0, area: 'square' },
  simple_arrow:       { atk: 10, reqLevel: 1 },
  sniper_arrow:       { atk: 28, reqLevel: 20 },
  flash_arrow:        { atk: 14, reqLevel: 20, element: 'energy' },
  shiver_arrow:       { atk: 14, reqLevel: 20, element: 'ice' },
  flaming_arrow:      { atk: 14, reqLevel: 20, element: 'fire' },
  earth_arrow:        { atk: 14, reqLevel: 20, element: 'earth' },
  piercing_bolt:      { atk: 33, reqLevel: 30 },
  tarsal_arrow:       { atk: 33, reqLevel: 30 },
  onyx_arrow:         { atk: 38, reqLevel: 40 },
  vortex_bolt:        { atk: 36, reqLevel: 40 },
  crystal_bolt:       { atk: 36, reqLevel: 0 },
  shatterstorm_arrow: { atk: 27, reqLevel: 50 },
  power_bolt:         { atk: 40, reqLevel: 55 },
  drill_bolt:         { atk: 56, reqLevel: 70 },
  envenomed_arrow:    { atk: 27, reqLevel: 70, element: 'earth' },
  crystalline_arrow:  { atk: 65, reqLevel: 90 },
  prismatic_bolt:     { atk: 66, reqLevel: 90 },
  infernal_bolt:      { atk: 72, reqLevel: 110 },
  // As "storm" são puramente elementais: ataque físico 0, dano no elemento.
  firestorm_arrow:    { atk: 0, reqLevel: 125, element: 'fire' },
  froststorm_arrow:   { atk: 0, reqLevel: 125, element: 'ice' },
  terrastorm_arrow:   { atk: 0, reqLevel: 125, element: 'earth' },
  thunderstorm_arrow: { atk: 0, reqLevel: 125, element: 'energy' },
  diamond_arrow:      { atk: 37, reqLevel: 150 },
  spectral_bolt:      { atk: 78, reqLevel: 150 },
};

let src = readFileSync(ARQ, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const relatorio = { removidas: [], corrigidas: [], adicionadas: [], intocadas: [] };

// --- remove as inventadas ---
for (const id of INVENTADAS) {
  const re = new RegExp(`^[ \\t]*${id}:\\s*\\{[^\\n]*\\},[ \\t]*\\r?\\n`, 'm');
  if (re.test(src)) { src = src.replace(re, ''); relatorio.removidas.push(id); }
}
// o kit inicial citava a versão inventada
const antesKit = src;
src = src.replace(/simple_arrow_weak/g, 'simple_arrow');
if (src !== antesKit) relatorio.corrigidas.push('kit inicial: simple_arrow_weak -> simple_arrow');

// --- corrige as reais ---
for (const [id, novo] of Object.entries(REAIS)) {
  const re = new RegExp(`^([ \\t]*${id}:\\s*\\{)([^\\n]*?)(\\},[ \\t]*)$`, 'm');
  const m = src.match(re);
  if (!m) { relatorio.adicionadas.push(id); continue; }
  let corpo = m[2];
  const set = (chave, valor) => {
    const rk = new RegExp(`(${chave}:\\s*)('[^']*'|[^,}]+)`);
    if (rk.test(corpo)) corpo = corpo.replace(rk, `$1${valor}`);
    else corpo = corpo.replace(/(type:\s*'ammo',)/, `$1 ${chave}: ${valor},`);
  };
  set('atk', novo.atk);
  set('reqLevel', novo.reqLevel);
  if (novo.element) set('element', `'${novo.element}'`);
  if (novo.area) set('area', `'${novo.area}'`);
  if (corpo !== m[2]) { src = src.replace(re, `$1${corpo}$3`); relatorio.corrigidas.push(id); }
  else relatorio.intocadas.push(id);
}

// --- adiciona a que falta, logo depois da bolt ---
if (relatorio.adicionadas.length) {
  const linhas = relatorio.adicionadas.map(id => {
    const d = REAIS[id];
    const extra = (d.element ? `, element: '${d.element}'` : '') + (d.area ? `, area: '${d.area}'` : '');
    const nome = id.split('_').map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
    return `  ${id}:${' '.repeat(Math.max(1, 16 - id.length))}{ name: '${nome}', icon: '🏹', type: 'ammo', atk: ${d.atk}, reqLevel: ${d.reqLevel}${extra}, sell: 0 },`;
  }).join(eol);
  src = src.replace(/^([ \t]*bolt:\s*\{[^\n]*\},[ \t]*)$/m, `$1${eol}${linhas}`);
}

writeFileSync(ARQ, src);
console.log(`removidas (não existem no Tibia): ${relatorio.removidas.length}`);
relatorio.removidas.forEach(i => console.log('  - ' + i));
console.log(`\ncorrigidas (ataque/nível/elemento/área): ${relatorio.corrigidas.length}`);
relatorio.corrigidas.forEach(i => console.log('  ~ ' + i));
console.log(`\nadicionadas (existiam no Tibia e faltavam): ${relatorio.adicionadas.length}`);
relatorio.adicionadas.forEach(i => console.log('  + ' + i));
if (relatorio.intocadas.length) console.log(`\njá estavam certas: ${relatorio.intocadas.join(', ')}`);
