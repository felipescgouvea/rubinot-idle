// Baixa os ícones REAIS dos imbuements do TibiaWiki pra assets/sprites/imbuements/.
// Mesmo pipeline de fetch-spell-icons.mjs (API do Fandom -> webp). O jogo monta a
// URL pelo NOME do imbuement (ver infrastructure/tibiaSprites.js: imbueIconFile).
//
// Uso: node scripts/fetch-imbue-icons.mjs [--todas]
import { IMBUEMENTS } from '../src/domain/imbuements.js?v=0';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'assets/sprites/imbuements';
const TODAS = process.argv.includes('--todas');
mkdirSync(DESTINO, { recursive: true });

const arquivoDe = nome => nome.replace(/ /g, '_') + '.webp';

// Imbuements cujo arquivo no wiki não é "<nome>.gif" (ajustar se algum falhar).
const NOME_NO_WIKI = {};

async function urlDoWiki(nomeArquivo) {
  const api = 'https://tibia.fandom.com/api.php?action=query&titles=File:'
    + encodeURIComponent(nomeArquivo) + '&prop=imageinfo&iiprop=url&format=json';
  const j = await fetch(api).then(r => r.json()).catch(() => null);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const p = pages[Object.keys(pages)[0]];
  return p && p.imageinfo ? p.imageinfo[0].url : null;
}

const alvos = [...new Set(Object.values(IMBUEMENTS).map(i => i.name))]
  .filter(nome => TODAS || !existsSync(join(DESTINO, arquivoDe(nome))));

console.log(`imbuements: ${Object.keys(IMBUEMENTS).length} · sem ícone: ${alvos.length}`);
if (!alvos.length) { console.log('nada a baixar'); process.exit(0); }

const faltaram = [];
let baixadas = 0;
for (const nome of alvos) {
  const url = await urlDoWiki(NOME_NO_WIKI[nome] || (nome + '.gif'));
  if (!url) { faltaram.push(nome); continue; }
  const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  const webp = await sharp(buf, { animated: true }).webp({ quality: 90 }).toBuffer();
  writeFileSync(join(DESTINO, arquivoDe(nome)), webp);
  baixadas++;
  console.log(`  ${nome} -> ${arquivoDe(nome)} (${webp.length} bytes)`);
}

console.log(`\nbaixadas: ${baixadas}`);
if (faltaram.length) console.log(`SEM ÍCONE no wiki (${faltaram.length}): ${faltaram.join(', ')} — ajustar NOME_NO_WIKI ou cai no fallback.`);
