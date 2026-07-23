// CORRIGE hp/xp/gold/loot dos monstros de caçada pro Crystal Server (source
// local). Fonte canônica = Crystal Server (memory: crystalserver-fonte-canonica).
//
// O que MEXE:
//   hp, xp   -> valor direto do .lua (monster.health / monster.experience).
//   gold     -> [0, soma das moedas do loot] (gold×1 + platinum×100 + crystal×10000).
//   loot     -> tabela do source: item (que EXISTE no nosso catálogo) + chance
//               EXATA (chance/100000). Substitui os buckets de raridade do wiki.
// O que NÃO mexe (de propósito):
//   atk/def  -> escala própria da nossa fórmula de combate; o source separa em
//               melee/spell/armor/defense/mitigation, que um número só não
//               representa. Decisão antiga do Felipe ("deixe o atk como esta")
//               segue valendo — não é empate wiki-x-CS.
//   monstro SEM ref no source (RubinOT/custom) -> intocado.
//
// Item do source que NÃO existe no nosso catálogo é REPORTADO, nunca inventado.
//
// Uso: node scripts/fix-monstros-cs.mjs [--aplicar] [--so=id1,id2]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { monstroRef, REF_OK } from './cs-ref.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

if (!REF_OK) { console.error('reference/crystalserver ausente'); process.exit(2); }
const APLICAR = process.argv.includes('--aplicar');
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];

// Casa nome de item entre catálogos. Tira SÓ o sufixo de DESAMBIGUAÇÃO da wiki
// ("(Item)"/"(Creature)", ex.: "Skull (Item)" == "skull") — NÃO tira sufixo de
// VARIANTE ("(Orcsoberfest)", "(Immobile)", "(Object)", "(Brown)"), que marca um
// item DIFERENTE. Tirar tudo fazia CS "bone" casar com "Bone (Orcsoberfest)"
// (evento, 243 gold) e inflar a economia — colisão real (26 itens).
const norm = s => String(s).toLowerCase().replace(/\s*\((item|creature)\)\s*/gi, ' ').replace(/[^a-z0-9]/g, '');
const idPorNome = new Map();
for (const [id, it] of Object.entries(ITEMS)) { const k = norm(it.name); if (!idPorNome.has(k)) idPorNome.set(k, id); }

const emHunt = new Set();
for (const z of Object.values(ZONES)) { (z.monsters || []).forEach(m => emHunt.add(m)); if (z.boss) emHunt.add(z.boss); }
const alvos = SO ? SO.split(',').filter(id => MONSTERS[id]) : [...emHunt].filter(id => MONSTERS[id]);

let src = readFileSync('src/domain/bestiary.js', 'utf8');
const alterados = [], semRef = [];
const semCatalogo = new Map();

// arredonda a chance como o resto do bestiário: até 4 casas, sem zeros à toa
const fmtCh = c => { const r = Math.round(c * 1e5) / 1e5; return String(r); };

for (const id of alvos) {
  const m = MONSTERS[id];
  const ref = monstroRef(m.name);
  if (!ref) { semRef.push(id); continue; }

  // monta o loot novo (só itens que temos)
  const novoLoot = [];
  for (const l of ref.loot) {
    const itemId = idPorNome.get(norm(l.nome));
    if (!itemId) { if (!semCatalogo.has(l.nome)) semCatalogo.set(l.nome, 0); semCatalogo.set(l.nome, semCatalogo.get(l.nome) + 1); continue; }
    if (novoLoot.some(([x]) => x === itemId)) continue;
    novoLoot.push([itemId, Math.round(l.chancePct * 1e5) / 1e5]);
  }
  const lootTxt = '[' + novoLoot.map(([i, c]) => `['${i}',${fmtCh(c)}]`).join(',') + ']';
  const goldTxt = `[0,${ref.goldMax}]`;

  // acha a linha do MONSTRO. Cuidado: um id pode existir também como ZONE
  // (ex.: glooth_bandit é zona E monstro) — o indexOf simples pegava a linha da
  // zona (sem hp/loot) e não mexia em nada. Varre todas as ocorrências e pega a
  // que TEM hp: (a definição de monstro), não city:/monsters: (a da zona).
  const marca = '\n  ' + id + ':';
  let ini = -1, busca = 0;
  while ((busca = src.indexOf(marca, busca)) >= 0) {
    const linhaCand = src.slice(busca + 1, src.indexOf('\n', busca + 1));
    if (/\bhp:\s*-?\d+/.test(linhaCand)) { ini = busca; break; }
    busca += marca.length;
  }
  if (ini < 0) { semRef.push(id + ' (linha de monstro não achada)'); continue; }
  const fim = src.indexOf('\n', ini + 1);
  let linha = src.slice(ini + 1, fim);
  const orig = linha;

  if (ref.hp != null) linha = linha.replace(/(\bhp:\s*)-?\d+/, '$1' + ref.hp);
  if (ref.xp != null) linha = linha.replace(/(\bxp:\s*)-?\d+/, '$1' + ref.xp);
  linha = linha.replace(/(\bgold:\s*)\[[^\]]*\]/, '$1' + goldTxt);
  // loot é o último campo antes do fecho } — troca do 'loot:' até o ] que
  // antecede o ' }' final da linha.
  linha = linha.replace(/(\bloot:\s*)\[[\s\S]*\](\s*\})/, '$1' + lootTxt.replace(/\$/g, '$$$$') + '$2');

  if (linha !== orig) {
    src = src.slice(0, ini + 1) + linha + src.slice(fim);
    alterados.push(`${id}: hp ${m.hp}->${ref.hp} xp ${m.xp}->${ref.xp} loot ${(m.loot || []).length}->${novoLoot.length}`);
  }
}

console.log(`alvos: ${alvos.length} · alterados: ${alterados.length} · sem ref no source: ${semRef.length}`);
alterados.slice(0, 30).forEach(l => console.log('  ~ ' + l));
if (alterados.length > 30) console.log(`  ... e mais ${alterados.length - 30}`);
console.log(`\nITENS do source SEM correspondência no nosso catálogo (${semCatalogo.size}) — reportados, não inventados:`);
[...semCatalogo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([n, c]) => console.log(`  · ${n} (${c}x)`));

if (APLICAR) { writeFileSync('src/domain/bestiary.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar)');
