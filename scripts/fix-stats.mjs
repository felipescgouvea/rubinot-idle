// CORRIGE hp/xp dos monstros cujos valores estão OBVIAMENTE corrompidos.
//
// Só mexe no que não pode ser decisão de balanceamento:
//   - divergência maior que 3x (pra cima ou pra baixo) contra o TibiaWiki
//
// Fora do corte, de propósito:
//   - ATK: 152 divergências, TODAS pra baixo e com proporção parecida. Erro com
//     direção única é sinal de ESCALA diferente, não de erro — nosso `atk`
//     alimenta a fórmula de combate e não é "dano máximo do wiki". Multiplicar
//     tudo pra "consertar" quebraria o combate inteiro. Felipe mandou manter.
//   - DEF: 75 de 84 pra cima, razão mediana 1,61 — mesmo perfil direcional do
//     atk. Fica com ele até a régua ser decidida.
//   - hp/xp com divergência até 3x: pode ser ajuste consciente de dificuldade.
//
// O que sobra é dado corrompido inequívoco: darklight_striker, darklight_matter
// e darklight_source com hp 3.103.386 IDÊNTICO (o real varia entre 29.700 e
// 31.550), e the_baron_from_below com 300 XP no lugar de 300.000.
//
// Uso: node scripts/fix-stats.mjs [--aplicar]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { paginaWiki, numero } from './wiki-cache.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const APLICAR = process.argv.includes('--aplicar');
const FATOR = 3;   // divergência acima disto não é balanceamento, é dado quebrado

const emHunt = new Set();
for (const z of Object.values(ZONES)) {
  (z.monsters || []).forEach(m => emHunt.add(m));
  if (z.boss) emHunt.add(z.boss);
}
const alvos = [...emHunt].filter(id => MONSTERS[id]);

let src = readFileSync('src/domain/bestiary.js', 'utf8');
const trocas = [], mantidos = [];

for (const id of alvos) {
  const m = MONSTERS[id];
  const txt = await paginaWiki(m.name);
  if (!txt || !/\{\{Infobox Creature/i.test(txt)) continue;
  const alvo = { hp: numero(txt, 'hp'), xp: numero(txt, 'exp') };

  const re = new RegExp(`^(\\s*${id}:\\s*\\{.*)$`, 'm');
  const linha = src.match(re);
  if (!linha) continue;
  let nova = linha[1];
  const feitas = [];

  for (const campo of ['hp', 'xp']) {
    const real = alvo[campo];
    const nosso = m[campo];
    if (real == null || nosso == null || real === 0) continue;
    const razao = nosso / real;
    if (razao <= FATOR && razao >= 1 / FATOR) {
      if (nosso !== real) mantidos.push(`${id}.${campo}: ${nosso} vs ${real} (${razao.toFixed(2)}x — dentro da margem)`);
      continue;
    }
    const antes = nova;
    nova = nova.replace(new RegExp(`(\\b${campo}:\\s*)\\d+`), `$1${real}`);
    if (nova !== antes) feitas.push(`${campo} ${nosso} -> ${real} (${razao.toFixed(1)}x)`);
  }

  if (feitas.length) {
    src = src.replace(re, nova.replace(/\$/g, '$$$$'));
    trocas.push(`${id}: ${feitas.join(' · ')}`);
  }
}

console.log(`corrigidos: ${trocas.length} monstro(s)`);
trocas.slice(0, 50).forEach(l => console.log('  ~ ' + l));
if (trocas.length > 50) console.log(`  ... e mais ${trocas.length - 50}`);
console.log(`\nMANTIDOS (divergência até ${FATOR}x — pode ser balanceamento): ${mantidos.length}`);
mantidos.slice(0, 12).forEach(l => console.log('  · ' + l));

if (APLICAR) { writeFileSync('src/domain/bestiary.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar para gravar)');
