// BALANCEAMENTO econômico por zona (analítico) — depois que o loot virou o do
// Crystal Server (chances exatas, mais generosas) e a loja/runas mudaram.
//
// Pra cada zona calcula, ponderado pelo peso de spawn:
//   xp/kill   = XP médio por morte
//   gold/kill = ouro médio + Σ(venda do item × chance)   [economia real por kill]
//   hp médio  = dificuldade aproximada (proxy)
//   eficiência = reward/hp — quanto se ganha por ponto de vida que precisa vazar
//
// Gap = zona MUITO fora da curva (spot de farm exploitável): eficiência muito
// acima da mediana pra sua faixa de mundo, ou reward que não cresce com a
// dificuldade (zona difícil pagando menos que uma fácil).
//
// Uso: node scripts/audit-balanceamento.mjs
import { MONSTERS, ZONES } from '../src/domain/bestiary.js?v=9';
import { ITEMS } from '../src/domain/items.js?v=9';

const mid = arr => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 0; };
const linhas = [];

for (const [zid, z] of Object.entries(ZONES)) {
  const mons = z.monsters || [];
  if (!mons.length) continue;
  const pesos = z.spawn || Object.fromEntries(mons.map(m => [m, 1]));
  const total = mons.reduce((s, m) => s + (pesos[m] || 1), 0) || 1;
  let xp = 0, gold = 0, hp = 0;
  for (const mid2 of mons) {
    const m = MONSTERS[mid2]; if (!m) continue;
    const w = (pesos[mid2] || 1) / total;
    xp += (m.xp || 0) * w;
    hp += (m.hp || 1) * w;
    const g = Array.isArray(m.gold) ? (m.gold[0] + m.gold[1]) / 2 : 0;
    let lootVal = 0;
    for (const e of (m.loot || [])) { const [id, ch] = Array.isArray(e) ? e : [e, 0]; lootVal += (ITEMS[id]?.sell || 0) * (ch || 0); }
    gold += (g + lootVal) * w;
  }
  linhas.push({ zid, world: z.worldReq || '—', xp: +xp.toFixed(0), gold: +gold.toFixed(0), hp: +hp.toFixed(0),
    xpHp: +(xp / hp).toFixed(3), goldHp: +(gold / hp).toFixed(3) });
}

// medianas globais de eficiência
const medXpHp = mid(linhas.map(l => l.xpHp));
const medGoldHp = mid(linhas.map(l => l.goldHp));

// outliers: eficiência > 3x a mediana (farm bom demais) ou < 1/3 (zona morta)
const altoXp = linhas.filter(l => l.xpHp > medXpHp * 3).sort((a, b) => b.xpHp - a.xpHp);
const altoGold = linhas.filter(l => l.goldHp > medGoldHp * 3).sort((a, b) => b.goldHp - a.goldHp);

console.log(`zonas: ${linhas.length} · mediana XP/hp ${medXpHp} · mediana gold/hp ${medGoldHp}`);
console.log(`\n${'='.repeat(72)}\nEFICIÊNCIA DE XP muito acima da curva (>3x mediana) — farm de XP\n${'='.repeat(72)}`);
altoXp.slice(0, 15).forEach(l => console.log(`  ⚠ ${l.zid.padEnd(26)} xp/kill ${String(l.xp).padStart(5)} · hp ${String(l.hp).padStart(5)} · xp/hp ${l.xpHp} (${(l.xpHp / medXpHp).toFixed(1)}x)`));
console.log(`\n${'='.repeat(72)}\nEFICIÊNCIA DE GOLD muito acima da curva (>3x mediana) — farm de ouro\n${'='.repeat(72)}`);
altoGold.slice(0, 15).forEach(l => console.log(`  ⚠ ${l.zid.padEnd(26)} gold/kill ${String(l.gold).padStart(6)} · hp ${String(l.hp).padStart(5)} · gold/hp ${l.goldHp} (${(l.goldHp / medGoldHp).toFixed(1)}x)`));

// progressão invertida: zona de mundo mais avançado pagando MENOS que a mediana
console.log(`\ntop 5 gold/kill absoluto:`);
[...linhas].sort((a, b) => b.gold - a.gold).slice(0, 5).forEach(l => console.log(`  ${l.zid} — gold/kill ${l.gold} (mundo ${l.world})`));
console.log(`\nRESULTADO: ${altoXp.length + altoGold.length ? 'REVISAR — ' + (altoXp.length + altoGold.length) + ' zona(s) fora da curva' : 'PASSOU — economia sem outlier grosseiro'}`);
