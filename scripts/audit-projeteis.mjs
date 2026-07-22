// AUDITORIA DE PROJÉTEIS E EFEITOS — toda sprite que o combate PODE pedir
// existe e é alcançável?
//
// Motivo: missileSpriteFile() filtra por uma LISTA BRANCA (MISSILE_NAMES).
// Nome fora dela devolve null e playProjectile() sai sem desenhar nada — em
// SILÊNCIO, sem erro no console. Um projétil que não voa é invisível pra
// qualquer teste que só olhe se a tela quebrou.
//
// Cobre os 4 caminhos que produzem projétil/efeito:
//   munição (distance) · magia · runa · wand/rod
//
// Uso: node scripts/audit-projeteis.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { ITEMS } from '../src/domain/items.js?v=0';
import { SPELLS } from '../src/domain/spells.js?v=0';
import { basicAttackMissile, spellMissileName, runeMissileName, spellEffectName, runeEffectName } from '../src/domain/combatFx.js?v=0';

// Lê a lista branca REAL do código em vez de copiá-la aqui. Uma cópia neste
// arquivo desemparelharia do jogo com o tempo e o teste passaria a aprovar o
// que o jogo não faz — que é exatamente a falha sendo corrigida.
const fonte = readFileSync('src/infrastructure/tibiaSprites.js', 'utf8');
const bloco = fonte.match(/const MISSILE_NAMES = new Set\(\[([\s\S]*?)\]\)/);
const MISSILE_NAMES = new Set([...(bloco ? bloco[1] : '').matchAll(/'([^']+)'/g)].map(m => m[1]));
const EFFECT_NAMES = new Set(['fire','energy','ice','holy','physical','death','earth','groundshaker','blood','hitarea']);
const temArquivo = (pasta, nome, ext) => existsSync(`assets/sprites/${pasta}/${nome}.${ext}`);

const semRota = [];   // sprite existe no disco mas a lista branca barra → não voa
const semSprite = []; // passa na lista branca mas não há arquivo → imagem quebrada
const ok = [];

function conferirMissil(origem, nome) {
  if (!nome) return;
  const naLista = MISSILE_NAMES.has(nome);
  const noDisco = temArquivo('missiles', nome, 'webp');
  if (!naLista && noDisco) semRota.push(`${origem} → "${nome}" (sprite EXISTE mas a lista branca barra: não voa nada)`);
  else if (!naLista && !noDisco) semRota.push(`${origem} → "${nome}" (sem sprite e fora da lista: não voa nada)`);
  else if (naLista && !noDisco) semSprite.push(`${origem} → "${nome}" (na lista mas SEM arquivo: imagem quebrada)`);
  else ok.push(nome);
}

// 1. MUNIÇÃO — todo item de munição do jogo
const municoes = Object.entries(ITEMS).filter(([, i]) => i.type === 'ammo');
for (const [id] of municoes) conferirMissil(`munição ${id}`, basicAttackMissile({ attackSkill: 'distance', ammoId: id }));

// 2. WAND/ROD — todo item de arma mágica
// Wand/rod não é um `type` — é weaponType 'magic' (campo wandDmg). Filtrar por
// type devolvia ZERO wands e o caminho mágico não era conferido de fato.
const wands = Object.entries(ITEMS).filter(([, i]) => i.weaponType === 'magic');
for (const [id] of wands) conferirMissil(`wand ${id}`, basicAttackMissile({ attackSkill: 'magic', weaponId: id }));

// 3. MAGIAS e 4. RUNAS
for (const id of Object.keys(SPELLS)) conferirMissil(`magia ${id}`, spellMissileName(id));
for (const [id, i] of Object.entries(ITEMS)) if (i.type === 'rune') conferirMissil(`runa ${id}`, runeMissileName(id));

// EFEITOS de impacto de cada magia/runa
const efeitoRuim = [];
for (const [id, s] of Object.entries(SPELLS)) {
  const e = spellEffectName(id, s.element);
  if (!EFFECT_NAMES.has(e)) efeitoRuim.push(`magia ${id} → efeito "${e}" fora da lista branca`);
  else if (!temArquivo('effects', e, 'gif')) efeitoRuim.push(`magia ${id} → efeito "${e}" sem arquivo`);
}
for (const [id, i] of Object.entries(ITEMS)) {
  if (i.type !== 'rune') continue;
  const e = runeEffectName(id);
  if (!EFFECT_NAMES.has(e)) efeitoRuim.push(`runa ${id} → efeito "${e}" fora da lista branca`);
  else if (!temArquivo('effects', e, 'gif')) efeitoRuim.push(`runa ${id} → efeito "${e}" sem arquivo`);
}

// A lista branca tem que espelhar a PASTA, nos dois sentidos: nome sem arquivo
// dá imagem quebrada; arquivo fora da lista é sprite baixada que nunca voa.
const naPasta = new Set(readdirSync('assets/sprites/missiles').filter(f => f.endsWith('.webp')).map(f => f.replace('.webp', '')));
const desalinho = [
  ...[...MISSILE_NAMES].filter(n => !naPasta.has(n)).map(n => `"${n}" está na lista branca mas NÃO existe em assets/sprites/missiles/`),
  ...[...naPasta].filter(n => !MISSILE_NAMES.has(n)).map(n => `"${n}.webp" existe na pasta mas está FORA da lista branca (nunca vai voar)`),
];

console.log(`munições: ${municoes.length} · wands/rods: ${wands.length} · magias: ${Object.keys(SPELLS).length}`);
console.log(`lista branca: ${MISSILE_NAMES.size} nomes · pasta: ${naPasta.size} arquivos`);
console.log(`projéteis resolvidos com sprite: ${new Set(ok).size} nomes distintos`);
const problemas = [...desalinho, ...semRota, ...semSprite, ...efeitoRuim];
if (!problemas.length) console.log('\nRESULTADO: PASSOU — todo projétil/efeito pedido pelo combate tem rota e sprite');
else {
  console.log(`\nRESULTADO: FALHOU — ${problemas.length} problema(s)`);
  if (desalinho.length) { console.log(`
  LISTA BRANCA x PASTA (${desalinho.length}):`); desalinho.forEach(p => console.log("   ✗ " + p)); }
  if (semRota.length) { console.log(`\n  NÃO VOA NADA (${semRota.length}):`); semRota.slice(0, 40).forEach(p => console.log('   ✗ ' + p)); if (semRota.length > 40) console.log(`   ... +${semRota.length - 40}`); }
  if (semSprite.length) { console.log(`\n  IMAGEM QUEBRADA (${semSprite.length}):`); semSprite.forEach(p => console.log('   ✗ ' + p)); }
  if (efeitoRuim.length) { console.log(`\n  EFEITO DE IMPACTO (${efeitoRuim.length}):`); efeitoRuim.slice(0, 20).forEach(p => console.log('   ✗ ' + p)); }
  process.exitCode = 1;
}
