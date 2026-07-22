// Baixa os sprites REAIS de projétil (distance effect) do TibiaWiki.
//
// Cada munição do Tibia tem seu PRÓPRIO projétil — o items.xml do Canary dá o
// `shootType` de cada uma (arrow, burstarrow, onyxarrow, spectralbolt...), 21
// distintos. Aqui só existiam 9 sprites genéricos por elemento, então a Burst
// Arrow saía como flecha comum e a maioria das munições voava errada.
//
// No wiki o arquivo é "<Nome do Item>_Missile.gif" (ex.: Burst_Arrow_Missile.gif).
// Não inventamos nome nem reaproveitamos sprite parecido: o que não existir no
// wiki é REPORTADO, pra decidir com a fonte na mão.
import { ITEMS } from '../src/domain/items.js?v=0';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DESTINO = 'assets/sprites/missiles';
mkdirSync(DESTINO, { recursive: true });

async function urlDoWiki(arquivo) {
  const api = 'https://tibia.fandom.com/api.php?action=query&titles=File:'
    + encodeURIComponent(arquivo) + '&prop=imageinfo&iiprop=url&format=json';
  const j = await fetch(api).then(r => r.json()).catch(() => null);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const p = pages[Object.keys(pages)[0]];
  return p && p.imageinfo ? p.imageinfo[0].url : null;
}

const municoes = Object.entries(ITEMS).filter(([, i]) => i.type === 'ammo');
const faltaram = [];
let baixadas = 0, pulou = 0;

for (const [id, item] of municoes) {
  const destino = join(DESTINO, id + '.webp');
  if (existsSync(destino)) { pulou++; continue; }
  const url = await urlDoWiki(item.name.replace(/ /g, '_') + '_Missile.gif');
  if (!url) { faltaram.push(`${id} ("${item.name}")`); continue; }
  const buf = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  // animated: alguns projéteis giram; preserva os quadros.
  const webp = await sharp(buf, { animated: true }).webp({ quality: 90, lossless: true }).toBuffer();
  writeFileSync(destino, webp);
  baixadas++;
  console.log(`  ${id.padEnd(20)} -> ${id}.webp (${webp.length} bytes)`);
}

console.log(`\nmunições: ${municoes.length} · baixadas: ${baixadas} · já existiam: ${pulou}`);
if (faltaram.length) {
  console.log(`SEM sprite de projétil no wiki (${faltaram.length}):`);
  faltaram.forEach(f => console.log('  - ' + f));
  console.log('Estas caem no projétil genérico do elemento — decidido com a fonte na mão, não por chute.');
}
