// AUDITORIA DE STATS DOS MONSTROS — hp / xp / ataque / defesa contra o wiki.
//
// Pedido do Felipe depois do loot: "ver se existe mais alguma alucinação nos
// monstros em termos de ataque/defesa/skill".
//
// Mapeamento (confirmado no Stone Golem, cujos hp/exp batem e o armor não):
//   nosso hp  <- wiki hp
//   nosso xp  <- wiki exp
//   nosso atk <- wiki maxdmg (soma dos componentes) ou o topo do melee
//   nosso def <- wiki armor
//
// Uso: node scripts/audit-stats-monstros.mjs [--so=id1,id2]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { paginaWiki, numero, maxDano } from './wiki-cache.mjs';
import { writeFileSync } from 'node:fs';

const emHunt = new Set();
for (const z of Object.values(ZONES)) {
  (z.monsters || []).forEach(m => emHunt.add(m));
  if (z.boss) emHunt.add(z.boss);
}
const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];
const alvos = SO ? SO.split(',').filter(id => MONSTERS[id]) : [...emHunt].filter(id => MONSTERS[id]);

const div = { hp: [], xp: [], atk: [], def: [] };
const semPagina = [];
let conferidos = 0;

// Tolerância: valor idêntico é o esperado; 10% cobre arredondamento de quem
// portou os dados. Acima disso é divergência de verdade.
const fora = (nosso, real) => real != null && nosso != null && Math.abs(nosso - real) > Math.max(1, real * 0.1);

for (const [i, id] of alvos.entries()) {
  const m = MONSTERS[id];
  const txt = await paginaWiki(m.name);
  if (!txt || !/\{\{Infobox Creature/i.test(txt)) { semPagina.push(`${id} ("${m.name}")`); continue; }
  conferidos++;
  const wHp = numero(txt, 'hp');
  const wXp = numero(txt, 'exp');
  const wDef = numero(txt, 'armor');
  const wAtk = maxDano(txt);
  if (fora(m.hp, wHp)) div.hp.push(`${id}: hp ${m.hp} vs wiki ${wHp}`);
  if (fora(m.xp, wXp)) div.xp.push(`${id}: xp ${m.xp} vs wiki ${wXp}`);
  if (fora(m.atk, wAtk)) div.atk.push(`${id}: atk ${m.atk} vs wiki ${wAtk}`);
  if (fora(m.def, wDef)) div.def.push(`${id}: def ${m.def} vs wiki armor ${wDef}`);
  if ((i + 1) % 40 === 0) console.log(`  ... ${i + 1}/${alvos.length}`);
}

const secao = (t, arr) => {
  console.log(`\n${'='.repeat(72)}\n${t} (${arr.length})\n${'='.repeat(72)}`);
  arr.slice(0, 40).forEach(l => console.log('  ✗ ' + l));
  if (arr.length > 40) console.log(`  ... e mais ${arr.length - 40}`);
};

console.log(`\nmonstros: ${alvos.length} · conferidos: ${conferidos}`);
secao('HP divergente', div.hp);
secao('XP divergente', div.xp);
secao('ATAQUE — INFORMATIVO, não reprova (régua diferente, ver comentário)', div.atk);
secao('DEFESA — INFORMATIVO, não reprova (mesmo perfil do ataque)', div.def);
secao('SEM PÁGINA de criatura no wiki', semPagina);

writeFileSync('scripts/stats-auditoria.json', JSON.stringify({ ...div, semPagina, conferidos }, null, 1));
// ATK e DEF ficam INFORMATIVOS, não reprovam.
//
// As 152 divergências de atk são todas pra baixo e com proporção parecida; as
// de def, 75 de 84 pra cima com razão mediana 1,61. Erro com direção única é
// sinal de ESCALA diferente, não de erro: nosso `atk` alimenta a fórmula de
// combate e não é o "dano máximo" do wiki. Deixá-los reprovando faria o teste
// gritar 236 falsos positivos pra sempre — e teste que grita sempre ninguém lê.
// Decisão do Felipe: manter os valores.
const total = div.hp.length + div.xp.length;
console.log(`\nrelatório em scripts/stats-auditoria.json`);
console.log(total ? `\nRESULTADO: FALHOU — ${total} divergência(s)` : '\nRESULTADO: PASSOU');
if (total) process.exitCode = 1;
