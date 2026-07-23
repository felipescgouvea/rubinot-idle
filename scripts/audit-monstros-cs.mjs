// AUDITORIA DE MONSTROS contra a REFERÊNCIA LOCAL do Crystal Server.
//
// Compara os 310 monstros de caçada com data-global/monster/*.lua (o source de
// verdade, não o rótulo de raridade do TibiaWiki que usávamos). Dimensões:
//   - hp / xp        : têm que bater (divergência = erro).
//   - gold           : maxCount do "gold coin" no loot do source.
//   - loot presença  : item que dropamos e o source NÃO tem (alucinação), e
//                      item que o source dropa e nós NÃO temos (faltando).
//   - loot chance    : nossa fração vs a chance EXATA do source.
// atk/def ficam INFORMATIVOS (decisão do Felipe: nosso atk é escala própria da
// fórmula de combate, não o maxDamage do source) — reportados, não reprovam.
//
// Uso: node scripts/audit-monstros-cs.mjs [--so=id1,id2]
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=0';
import { ITEMS } from '../src/domain/items.js?v=0';
import { monstroRef, itemNomePorId, REF_OK } from './cs-ref.mjs';
import { writeFileSync } from 'node:fs';

if (!REF_OK) { console.error('reference/crystalserver não encontrado — clone o repo primeiro'); process.exit(2); }

const SO = (process.argv.find(a => a.startsWith('--so=')) || '').split('=')[1];
const emHunt = new Set();
for (const z of Object.values(ZONES)) { (z.monsters || []).forEach(m => emHunt.add(m)); if (z.boss) emHunt.add(z.boss); }
const alvos = SO ? SO.split(',').filter(id => MONSTERS[id]) : [...emHunt].filter(id => MONSTERS[id]);

// Normaliza nome de item pra casar os dois catálogos. Tira o qualificador entre
// parênteses ANTES de remover não-alfanuméricos: o nosso catálogo desambigua com
// sufixos ("Skull (Item)" porque Skull também é efeito) que a fonte não usa —
// sem isso, "skull (item)" nunca casava com "skull" e inflava alucinado/faltando.
// Mesmo casamento do fixer: tira só desambiguação "(Item)/(Creature)", não
// variante — senão "bone" casa com "Bone (Orcsoberfest)" (colisão real).
const norm = s => String(s).toLowerCase().replace(/\s*\((item|creature)\)\s*/gi, ' ').replace(/[^a-z0-9]/g, '');
// nome do nosso item -> forma normalizada, pra casar com o nome do source
const nossoItemNome = new Map();
for (const [id, it] of Object.entries(ITEMS)) nossoItemNome.set(id, norm(it.name));

const div = { hp: [], xp: [], gold: [], alucinado: [], faltando: [], chance: [] };
const semRef = [];
let conferidos = 0;

// tolera chance dentro de fator 1.5 (rótulo de raridade nunca cai exato); acima
// disso é ordem de grandeza diferente.
const chanceLonge = (nosso, real) => real > 0 && (nosso / real > 1.6 || real / nosso > 1.6);

for (const id of alvos) {
  const m = MONSTERS[id];
  const ref = monstroRef(m.name);
  if (!ref) { semRef.push(`${id} ("${m.name}")`); continue; }
  conferidos++;

  if (ref.hp != null && m.hp !== ref.hp) div.hp.push({ id, nosso: m.hp, real: ref.hp });
  if (ref.xp != null && m.xp !== ref.xp) div.xp.push({ id, nosso: m.xp, real: ref.xp });

  // gold: comparamos o MÁXIMO (nosso gold[1]) com o maxCount do source
  const nossoGoldMax = Array.isArray(m.gold) ? m.gold[1] : 0;
  if (nossoGoldMax !== ref.goldMax && Math.abs(nossoGoldMax - ref.goldMax) > Math.max(1, ref.goldMax * 0.1)) {
    div.gold.push({ id, nosso: JSON.stringify(m.gold), real: ref.goldMax });
  }

  // loot: mapeia nossos ids -> nome normalizado; source -> nome normalizado
  const nossoLoot = new Map((m.loot || []).map(e => {
    const [iid, ch] = Array.isArray(e) ? e : [e, null];
    return [norm(ITEMS[iid]?.name || iid), { iid, ch }];
  }));
  const refLoot = new Map(ref.loot.map(l => [norm(l.nome), l]));

  // alucinação: item que dropamos e o source não tem
  for (const [nn, { iid, ch }] of nossoLoot) {
    if (!refLoot.has(nn)) div.alucinado.push({ id, item: iid, nome: ITEMS[iid]?.name || iid });
    else {
      const real = refLoot.get(nn).chancePct;
      if (ch != null && chanceLonge(ch, real)) div.chance.push({ id, item: iid, nosso: ch, real: +real.toFixed(4) });
    }
  }
  // faltando: item que o source dropa e não temos (e que EXISTE no nosso catálogo)
  for (const [nn, l] of refLoot) {
    if (!nossoLoot.has(nn)) {
      const nossoId = [...nossoItemNome.entries()].find(([, v]) => v === nn)?.[0];
      div.faltando.push({ id, nome: l.nome, temNoCatalogo: !!nossoId, chance: +l.chancePct.toFixed(4) });
    }
  }
}

const sec = (t, arr, fmt) => {
  console.log(`\n${'='.repeat(74)}\n${t} (${arr.length})\n${'='.repeat(74)}`);
  arr.slice(0, 30).forEach(x => console.log('  ✗ ' + fmt(x)));
  if (arr.length > 30) console.log(`  ... e mais ${arr.length - 30}`);
};

console.log(`monstros de caçada: ${alvos.length} · conferidos no source: ${conferidos} · sem ref (RubinOT/licença): ${semRef.length}`);
sec('HP divergente', div.hp, x => `${x.id}: hp ${x.nosso} vs source ${x.real}`);
sec('XP divergente', div.xp, x => `${x.id}: xp ${x.nosso} vs source ${x.real}`);
sec('GOLD divergente', div.gold, x => `${x.id}: gold ${x.nosso} vs source maxCount ${x.real}`);
sec('LOOT ALUCINADO (dropamos, source não tem)', div.alucinado, x => `${x.id}: ${x.nome} (${x.item})`);
sec('LOOT FALTANDO (source dropa, não temos)', div.faltando.filter(x => x.temNoCatalogo), x => `${x.id}: ${x.nome} (${(x.chance * 100).toFixed(2)}%) — existe no catálogo`);
sec('CHANCE longe do source (fator > 1.6x)', div.chance, x => `${x.id}: ${x.item} ${(x.nosso * 100).toFixed(2)}% vs ${(x.real * 100).toFixed(2)}%`);

const faltandoCatalogo = div.faltando.filter(x => x.temNoCatalogo).length;
writeFileSync('scripts/monstros-cs-auditoria.json', JSON.stringify({ ...div, semRef, conferidos }, null, 1));
console.log(`\nrelatório em scripts/monstros-cs-auditoria.json`);

const duros = div.hp.length + div.xp.length + div.gold.length + div.alucinado.length + faltandoCatalogo;
console.log(`\nDIVERGÊNCIAS DURAS (hp/xp/gold/alucinado/faltando): ${duros}`);
console.log(`CHANCE de loot longe do source (informativo — nossa era rótulo de raridade): ${div.chance.length}`);
console.log(duros ? `\nRESULTADO: FALHOU — ${duros} divergência(s) dura(s)` : '\nRESULTADO: PASSOU (duras)');
if (duros) process.exitCode = 1;
