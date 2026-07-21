// Puxa o npcvalue REAL do TibiaWiki pros itens que dropam nas hunts.
// Saida: scripts/npcvalues.json  { itemId: {name, npcvalue|null, raw} }
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const I = await import('../src/domain/items.js?v=nv');
const B = await import('../src/domain/bestiary.js?v=nv');
const monIds = new Set();
for (const z of Object.values(B.ZONES)) for (const x of (z.monsters || [])) monIds.add(typeof x === 'string' ? x : (x.id || x.key));
const lootIds = new Set();
for (const id of monIds) for (const [it] of (B.MONSTERS[id]?.loot || [])) lootIds.add(it);

const ids = [...lootIds];
const titleOf = id => (I.ITEMS[id]?.name || id);
const out = {};
const CH = 40;
for (let i = 0; i < ids.length; i += CH) {
  const chunk = ids.slice(i, i + CH);
  const titles = chunk.map(titleOf).join('|');
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&redirects=1&titles=' + encodeURIComponent(titles);
  let json;
  try { json = JSON.parse(execFileSync('curl', ['-s', '-m', '60', url], { maxBuffer: 1 << 28 }).toString()); }
  catch (e) { console.log('falha no chunk', i, e.message); continue; }
  // mapeia titulo normalizado -> conteudo
  const byTitle = new Map();
  const q = json.query || {};
  for (const p of Object.values(q.pages || {})) {
    const txt = p.revisions?.[0]?.slots?.main?.['*'];
    if (txt) byTitle.set(p.title.toLowerCase(), txt);
  }
  for (const r of (q.redirects || [])) { /* from -> to */ }
  const redir = new Map((q.redirects || []).map(r => [r.from.toLowerCase(), r.to.toLowerCase()]));
  const norm = new Map((q.normalized || []).map(r => [r.from.toLowerCase(), r.to.toLowerCase()]));
  for (const id of chunk) {
    let t = titleOf(id).toLowerCase();
    t = norm.get(t) || t; t = redir.get(t) || t;
    const txt = byTitle.get(t);
    if (!txt) { out[id] = { name: titleOf(id), npcvalue: null, raw: 'PAGINA_NAO_ENCONTRADA' }; continue; }
    const m = txt.match(/\|\s*npcvalue\s*=\s*([^\n|]*)/i);
    const raw = m ? m[1].trim() : '';
    const num = raw.match(/(\d[\d,]*)/);
    out[id] = { name: titleOf(id), npcvalue: num ? +num[1].replace(/,/g, '') : (/^(0|--|\s*)$/.test(raw) ? 0 : null), raw };
  }
  process.stdout.write(`${Math.min(i + CH, ids.length)}/${ids.length} `);
}
writeFileSync('scripts/npcvalues.json', JSON.stringify(out, null, 1));
const ok = Object.values(out).filter(v => v.npcvalue != null).length;
console.log(`\nok: ${ok}/${ids.length} com npcvalue`);
