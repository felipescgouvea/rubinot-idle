// Baixa os ícones REAIS das magias do TibiaWiki pra assets/sprites/spells/.
//
// O jogo monta a URL do ícone a partir do NOME da magia (ver
// infrastructure/tibiaSprites.js: spellIconFile), então toda magia nova entra
// no ar com o ícone quebrado até a sprite existir — foi o que a auditoria
// pegou depois de o catálogo crescer de 48 pra 140 magias.
//
// Roda sem argumento: descobre sozinho quais magias do catálogo ainda não têm
// arquivo e baixa só essas. `--todas` refaz tudo.
//
// Uso: node scripts/fetch-spell-icons.mjs [--todas]
import { SPELLS } from '../src/domain/spells.js?v=0';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'assets/sprites/spells';
const TODAS = process.argv.includes('--todas');
mkdirSync(DESTINO, { recursive: true });

const arquivoDe = nome => nome.replace(/ /g, '_') + '.webp';

// Magias cujo arquivo no wiki não é "<nome>.gif". As "Practice *" (do tutorial
// de Dawnport) simplesmente não têm ícone no TibiaWiki — essas caem no emoji.
const NOME_NO_WIKI = {
  'Invisibility': 'Invisible.gif',
  'Food': 'Food (Spell).gif',
};

// A API do Fandom devolve a URL real do arquivo. Buscar a página direto (sem
// API) volta HTML; e o WebFetch do agente toma 402 nesse domínio — por isso
// aqui é fetch puro contra api.php.
async function urlDoWiki(nomeArquivo) {
  const api = 'https://tibia.fandom.com/api.php?action=query&titles=File:'
    + encodeURIComponent(nomeArquivo) + '&prop=imageinfo&iiprop=url&format=json';
  const j = await fetch(api).then(r => r.json()).catch(() => null);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const p = pages[Object.keys(pages)[0]];
  return p && p.imageinfo ? p.imageinfo[0].url : null;
}

const alvos = [...new Set(Object.values(SPELLS).map(s => s.name))]
  .filter(nome => TODAS || !existsSync(join(DESTINO, arquivoDe(nome))));

console.log(`catálogo: ${Object.keys(SPELLS).length} magias · sem ícone: ${alvos.length}`);
if (!alvos.length) { console.log('nada a baixar'); process.exit(0); }

const faltaram = [];
let baixadas = 0;
for (const nome of alvos) {
  // No wiki o arquivo é o nome da magia com .gif. Apóstrofo e cia. já vêm
  // certos do próprio catálogo (os nomes são os oficiais do Tibia).
  const url = await urlDoWiki(NOME_NO_WIKI[nome] || (nome + '.gif'));
  if (!url) { faltaram.push(nome); continue; }
  const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  // Converte pra webp como as 48 que já existiam — o jogo só pede .webp.
  // `animated: true` preserva os ícones que piscam no wiki.
  const webp = await sharp(buf, { animated: true }).webp({ quality: 90 }).toBuffer();
  writeFileSync(join(DESTINO, arquivoDe(nome)), webp);
  baixadas++;
  console.log(`  ${nome} -> ${arquivoDe(nome)} (${webp.length} bytes)`);
}

console.log(`\nbaixadas: ${baixadas}`);
if (faltaram.length) {
  console.log(`SEM ÍCONE no TibiaWiki (${faltaram.length}): ${faltaram.join(', ')}`);
  console.log('Estas caem no emoji de fallback — sem 404, o jogo não tenta a imagem duas vezes.');
}
