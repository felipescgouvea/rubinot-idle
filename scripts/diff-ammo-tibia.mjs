// Confere o catálogo de MUNIÇÃO contra o Tibia real.
//
// Duas fontes, nesta ordem de confiança:
//   1. TFS 1.4 (data/items/items.xml + data/weapons/weapons.xml) — dá ataque e
//      nível mínimo de tudo que existia até lá
//   2. TibiaWiki, pra munição adicionada depois do 1.4 (as "storm arrows",
//      Diamond Arrow, Spectral Bolt...)
//
// Responde três perguntas:
//   - que munição nossa NÃO EXISTE no Tibia (inventada)?
//   - que munição do Tibia falta no nosso catálogo?
//   - o ataque e o nível mínimo batem?
//
// Uso: node scripts/diff-ammo-tibia.mjs
import { ITEMS } from '../src/domain/items.js?v=0';

const ITEMS_XML = 'https://raw.githubusercontent.com/otland/forgottenserver/1.4/data/items/items.xml';
const WEAPONS_XML = 'https://raw.githubusercontent.com/otland/forgottenserver/1.4/data/weapons/weapons.xml';

const itemsXml = await fetch(ITEMS_XML).then(r => r.text());
const weaponsXml = await fetch(WEAPONS_XML).then(r => r.text());

// nível mínimo por id (weapons.xml) — munição sem entrada aqui não tem trava
const nivelPorId = {};
for (const m of weaponsXml.matchAll(/<distance id="(\d+)"([^>]*)/g)) {
  const lvl = m[2].match(/level="(\d+)"/);
  nivelPorId[m[1]] = lvl ? Number(lvl[1]) : 0;
}

// munição do TFS: nome -> { id, atk, nivel }
const tfs = new Map();
for (const m of itemsXml.matchAll(/<item id="(\d+)"[^>]*name="([^"]+)"\s*>([\s\S]*?)<\/item>/g)) {
  const [, id, nome, corpo] = m;
  if (!/value="ammunition"/.test(corpo)) continue;
  const atk = corpo.match(/key="attack"\s+value="(\d+)"/);
  tfs.set(nome.toLowerCase(), { id, atk: atk ? Number(atk[1]) : 0, nivel: nivelPorId[id] || 0 });
}

// TibiaWiki pro que veio depois do 1.4. Só consultamos o que o TFS não conhece.
async function noWiki(nome) {
  const api = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles='
    + encodeURIComponent(nome);
  const j = await fetch(api).then(r => r.json()).catch(() => null);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const p = pages[Object.keys(pages)[0]];
  if (!p || !p.revisions) return null;
  const txt = p.revisions[0]['*'] || '';
  if (!/\|\s*class\s*=\s*Ammunition/i.test(txt) && !/{{Infobox Object/i.test(txt) && !/Ammunition/i.test(txt)) return null;
  const atk = txt.match(/\|\s*attack\s*=\s*(\d+)/i);
  const lvl = txt.match(/\|\s*levelrequired\s*=\s*(\d+)/i);
  return { atk: atk ? Number(atk[1]) : null, nivel: lvl ? Number(lvl[1]) : 0, existe: true };
}

const nossas = Object.entries(ITEMS).filter(([, i]) => i.type === 'ammo');
const nomeDe = id => (ITEMS[id].name || '').toLowerCase();

const inexistentes = [], faltando = [], divergentes = [];

for (const [id, item] of nossas) {
  const real = tfs.get(nomeDe(id));
  if (real) {
    const d = [];
    if (real.atk && item.atk !== real.atk) d.push(`atk ${item.atk} != ${real.atk}`);
    if ((item.reqLevel || 0) !== real.nivel) d.push(`nível ${item.reqLevel || 0} != ${real.nivel}`);
    if (d.length) divergentes.push(`${item.name.padEnd(24)} ${d.join(' · ')}`);
    continue;
  }
  const wiki = await noWiki(item.name);
  if (!wiki) { inexistentes.push(`${id.padEnd(26)} "${item.name}"`); continue; }
  const d = [];
  if (wiki.atk && item.atk !== wiki.atk) d.push(`atk ${item.atk} != ${wiki.atk} (wiki)`);
  if ((item.reqLevel || 0) !== wiki.nivel) d.push(`nível ${item.reqLevel || 0} != ${wiki.nivel} (wiki)`);
  if (d.length) divergentes.push(`${item.name.padEnd(24)} ${d.join(' · ')}`);
}

const nossosNomes = new Set(nossas.map(([id]) => nomeDe(id)));
for (const [nome, d] of tfs) {
  if (!nossosNomes.has(nome)) faltando.push(`${nome.padEnd(24)} atk ${d.atk} · nível ${d.nivel}`);
}

const cab = s => `\n${'='.repeat(66)}\n${s}\n${'='.repeat(66)}`;
console.log(`nosso catálogo: ${nossas.length} munições · TFS 1.4: ${tfs.size}`);
console.log(cab(`NÃO EXISTEM no Tibia — candidatas a remoção (${inexistentes.length})`));
inexistentes.forEach(l => console.log('  ' + l));
console.log(cab(`EXISTEM no Tibia e faltam aqui (${faltando.length})`));
faltando.forEach(l => console.log('  ' + l));
console.log(cab(`ATAQUE / NÍVEL divergentes (${divergentes.length})`));
divergentes.forEach(l => console.log('  ' + l));
