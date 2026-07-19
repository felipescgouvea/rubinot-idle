// Auditor ESTÁTICO do jogo — roda sem browser/servidor e pega uma classe de
// bugs sem precisar de teste manual:
//   1. Sprites 404: item/monstro RENDERIZADO cujo .webp esperado não existe em
//      assets/sprites/ (é o que gera "GET ...webp 404" no console do jogador).
//   2. Invariantes de dados: monstro de hunt com hp/atk/xp inválido ou
//      placeholder absurdo; magia com min>max ou sem elemento.
// Uso: node scripts/audit-static.mjs   (exit 1 se achar problema)
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const v = '?v=' + Date.now();
const { ITEMS } = await import('file://' + join(ROOT, 'src/domain/items.js').replace(/\\/g, '/') + v);
const { MONSTERS, ZONES } = await import('file://' + join(ROOT, 'src/domain/bestiary.js').replace(/\\/g, '/') + v);
const { itemSpriteFile, monsterSpriteFile, SPRITELESS_ITEMS = [] } = await import('file://' + join(ROOT, 'src/infrastructure/tibiaSprites.js').replace(/\\/g, '/') + v);
const spriteless = new Set(SPRITELESS_ITEMS); // itens sem sprite mas JÁ pré-marcados (não vão 404)

const stripQ = s => s.replace(/\?.*$/, '');
const itemFiles = new Set(readdirSync(join(ROOT, 'assets/sprites/items')));
const monFiles = new Set(readdirSync(join(ROOT, 'assets/sprites/monsters')));

// Conjunto de itens REALMENTE renderizados (loot de hunt, kits, loja) — são os
// que podem gerar 404 na tela; um item de catálogo nunca mostrado, não.
const huntMonsterIds = new Set();
Object.values(ZONES).forEach(z => { (z.monsters || []).forEach(id => huntMonsterIds.add(id)); if (z.boss) huntMonsterIds.add(z.boss); });
const renderedItems = new Set();
for (const id of huntMonsterIds) {
  const m = MONSTERS[id];
  if (m && m.loot) m.loot.forEach(([itemId]) => renderedItems.add(itemId));
}
// starter kits + shop, se existirem
try {
  const it = await import('file://' + join(ROOT, 'src/domain/items.js').replace(/\\/g, '/') + v);
  // STARTER_KITS é slot->itemId (usa os VALORES); STARTER_SUPPLIES é itemId->qtd (usa as CHAVES).
  Object.values(it.STARTER_KITS || {}).forEach(kit => Object.values(kit).forEach(id => renderedItems.add(id)));
  Object.values(it.STARTER_SUPPLIES || {}).forEach(kit => Object.keys(kit).forEach(id => renderedItems.add(id)));
} catch {}
try {
  const sc = await import('file://' + join(ROOT, 'src/domain/shopCatalog.js').replace(/\\/g, '/') + v);
  (sc.SHOP_ITEMS || []).forEach(s => { if (s.itemId) renderedItems.add(s.itemId); });
} catch {}

const problems = { missingItemSprite: [], missingMonSprite: [], badMonster: [], badSpell: [] };

for (const id of renderedItems) {
  if (!ITEMS[id]) { problems.badMonster.push(`loot aponta pra item inexistente: ${id}`); continue; }
  const f = stripQ(itemSpriteFile(id)).replace(/^items\//, '');
  if (!itemFiles.has(f) && !spriteless.has(id)) problems.missingItemSprite.push(`${id} -> ${f}`);
}
for (const id of huntMonsterIds) {
  const m = MONSTERS[id];
  if (!m) { problems.badMonster.push(`zona referencia monstro inexistente: ${id}`); continue; }
  const f = stripQ(monsterSpriteFile(id, m)).replace(/^monsters\//, '');
  if (!monFiles.has(f)) problems.missingMonSprite.push(`${id} -> ${f}`);
  // invariantes
  if (!(m.hp > 0) || !Number.isFinite(m.hp)) problems.badMonster.push(`${id}: hp inválido (${m.hp})`);
  if (!(m.atk >= 0) || !Number.isFinite(m.atk)) problems.badMonster.push(`${id}: atk inválido (${m.atk})`);
  if (!(m.xp >= 0) || !Number.isFinite(m.xp)) problems.badMonster.push(`${id}: xp inválido (${m.xp})`);
  if (m.hp >= 50000 || m.atk >= 2000) problems.badMonster.push(`${id}: valor placeholder suspeito (hp ${m.hp}, atk ${m.atk})`);
  (m.spells || []).forEach((s, i) => {
    if (!s.element) problems.badSpell.push(`${id} spell[${i}]: sem element`);
    if (s.max == null || !Number.isFinite(s.max)) problems.badSpell.push(`${id} spell[${i}]: max inválido`);
    if (s.min != null && s.min > s.max) problems.badSpell.push(`${id} spell[${i}]: min>max (${s.min}>${s.max})`);
  });
}

let total = 0;
const section = (title, arr) => {
  if (!arr.length) return;
  total += arr.length;
  console.log(`\n### ${title} (${arr.length})`);
  arr.slice(0, 40).forEach(x => console.log('  - ' + x));
  if (arr.length > 40) console.log(`  … +${arr.length - 40}`);
};
console.log('=== AUDITORIA ESTÁTICA ===');
console.log(`itens renderizados: ${renderedItems.size} | monstros de hunt: ${huntMonsterIds.size}`);
section('Sprites de ITEM faltando (404 no console)', problems.missingItemSprite);
section('Sprites de MONSTRO faltando (404 no console)', problems.missingMonSprite);
section('Monstros com dados inválidos/placeholder', problems.badMonster);
section('Magias inválidas', problems.badSpell);
console.log(total ? `\n❌ ${total} problemas` : '\n✅ nenhum problema estático');
process.exit(total ? 1 : 0);
