// Insere zonas novas em src/domain/bestiary.js (ZONES + ZONE_SPAWN) e as chaves
// de tradução em src/i18n/locales/{pt,en}.js.
//
// A lista vem de scripts/zones-to-add.json — o formato que o artefato de
// seleção produz, já traduzido para ids do jogo. É um script (e não edição à
// mão) porque cada zona toca 4 arquivos, e um esquecimento silencioso (spawn
// faltando, chave de i18n ausente) só apareceria em runtime.
//
// Os arquivos do projeto são CRLF: as âncoras aceitam \r antes do \n e as
// linhas inseridas reusam o fim de linha detectado no próprio arquivo.
import { readFileSync, writeFileSync } from 'node:fs';

const novas = JSON.parse(readFileSync('scripts/zones-to-add.json', 'utf8'));
const { MONSTERS, ZONES } = await import('../src/domain/bestiary.js?v=addzones');

// ---- valida TUDO antes de escrever qualquer arquivo ----
const erros = [];
for (const z of novas) {
  if (ZONES[z.id]) erros.push(`${z.id}: já existe em ZONES`);
  if (!z.monsters.length) erros.push(`${z.id}: sem monstros`);
  z.monsters.forEach(m => { if (!MONSTERS[m]) erros.push(`${z.id}: monstro inexistente "${m}"`); });
  if (z.boss && !z.monsters.includes(z.boss)) erros.push(`${z.id}: boss "${z.boss}" fora do elenco`);
  const soma = Object.values(z.spawn).reduce((a, b) => a + b, 0);
  if (soma !== 100) erros.push(`${z.id}: pesos de spawn somam ${soma}, deveriam somar 100`);
  Object.keys(z.spawn).forEach(m => { if (!z.monsters.includes(m)) erros.push(`${z.id}: spawn cita "${m}" fora do elenco`); });
  z.monsters.forEach(m => { if (!(m in z.spawn)) erros.push(`${z.id}: "${m}" sem peso de spawn`); });
}
if (erros.length) { console.error('ABORTADO:\n - ' + erros.join('\n - ')); process.exit(1); }

const aborta = msg => { console.error('ABORTADO: ' + msg); process.exit(1); };

// ---- ZONES ----
let src = readFileSync('src/domain/bestiary.js', 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

const porCidade = new Map();
for (const z of novas) {
  if (!porCidade.has(z.city)) porCidade.set(z.city, []);
  porCidade.get(z.city).push(z);
}

for (const [cidade, zs] of porCidade) {
  const titulo = cidade[0].toUpperCase() + cidade.slice(1);
  const re = new RegExp('^  // --- ' + titulo + '[^\\r\\n]*\\r?\\n', 'mi');
  const m = re.exec(src);
  if (!m) aborta(`não achei a seção "// --- ${titulo}" em ZONES`);
  const linhas = zs.map(z =>
    `  ${z.id}: { city: '${z.city}', name: 'zone.${z.id}', icon: '${z.icon}', worldReq: 'auroria', ` +
    `monsters: [${z.monsters.map(x => `'${x}'`).join(', ')}], theme: ['${z.theme[0]}', '${z.theme[1]}'], ` +
    `boss: '${z.boss}', biome: '${z.biome}' },`
  ).join(EOL);
  const pos = m.index + m[0].length;
  src = src.slice(0, pos) + linhas + EOL + src.slice(pos);
}

// ---- ZONE_SPAWN ----
const reSpawn = /^export const ZONE_SPAWN = \{\r?\n/m;
const mS = reSpawn.exec(src);
if (!mS) aborta('não achei a abertura de ZONE_SPAWN');
const linhasSpawn = novas.map(z =>
  `  ${z.id}: { ${Object.entries(z.spawn).map(([k, v]) => `${k}: ${v}`).join(', ')} },`
).join(EOL);
src = src.slice(0, mS.index + mS[0].length) + linhasSpawn + EOL + src.slice(mS.index + mS[0].length);
writeFileSync('src/domain/bestiary.js', src);

// ---- i18n (pt e en) ----
for (const [arquivo, idioma] of [['src/i18n/locales/pt.js', 'pt'], ['src/i18n/locales/en.js', 'en']]) {
  let t = readFileSync(arquivo, 'utf8');
  const eol = t.includes('\r\n') ? '\r\n' : '\n';
  const i = t.indexOf("  'zone.dragon_lair'");
  if (i === -1) aborta(`âncora de i18n não encontrada em ${arquivo}`);
  const linhas = novas.map(z => `  'zone.${z.id}': '${z[idioma].replace(/'/g, "\\'")}',`).join(eol) + eol;
  writeFileSync(arquivo, t.slice(0, i) + linhas + t.slice(i));
}

console.log(`inseridas ${novas.length} zonas:`);
novas.forEach(z => console.log(`  ${z.city.padEnd(9)} ${z.id.padEnd(26)} ${String(z.monsters.length).padStart(2)} monstros  ${z.pt}`));
