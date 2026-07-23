// AUDITORIA DE VOCAÇÃO DAS MAGIAS — contra o TibiaWiki.
//
// Por que não basta o Crystal Server: o spells.xml só traz <vocation> em ALGUMAS magias.
// Quando a tag falta, meu diff anterior leu como "liberada pras quatro
// vocações" — e foi assim que Enchant Staff, que é de mago, apareceu como
// magia de knight e paladino. A ausência da tag no Crystal Server não é permissão; é
// só a tag faltando.
//
// O TibiaWiki tem o campo `vocation` de cada magia, que é a lista real do jogo.
// Também confere existência: magia que não tem página é magia que eu inventei
// ou cujo nome está errado.
//
// Uso: node scripts/audit-spells-vocacao.mjs
import { SPELLS } from '../src/domain/spells.js?v=0';

const VOCS = ['sorcerer', 'druid', 'paladin', 'knight'];
const norm = s => s.toLowerCase()
  .replace(/master sorcerer/g, 'sorcerer').replace(/elder druid/g, 'druid')
  .replace(/royal paladin/g, 'paladin').replace(/elite knight/g, 'knight');

async function doWiki(nome) {
  const api = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles='
    + encodeURIComponent(nome);
  const j = await fetch(api).then(r => r.json()).catch(() => null);
  const pages = j && j.query && j.query.pages;
  if (!pages) return null;
  const k = Object.keys(pages)[0];
  if (k === '-1' || !pages[k].revisions) return null;
  const txt = pages[k].revisions[0]['*'] || '';
  // Só aceita página que É de magia — evita casar com um item de mesmo nome.
  if (!/\{\{Infobox Spell/i.test(txt)) return { semInfobox: true };
  const voc = txt.match(/\|\s*voc\s*=\s*([^\n|]+)/i) || txt.match(/\|\s*vocation\s*=\s*([^\n|]+)/i);
  const lvl = txt.match(/\|\s*levelrequired\s*=\s*(\d+)/i);
  const mana = txt.match(/\|\s*mana\s*=\s*(\d+)/i);
  const words = txt.match(/\|\s*words\s*=\s*([^\n|]+)/i);
  const listadas = voc ? norm(voc[1]).split(/[,/]+/).map(v => v.trim()).filter(Boolean) : [];
  return {
    vocs: VOCS.filter(v => listadas.some(l => l.includes(v))),
    nivel: lvl ? Number(lvl[1]) : null,
    mana: mana ? Number(mana[1]) : null,
    words: words ? words[1].trim().replace(/^"|"$/g, '') : null,
  };
}

const inexistentes = [], semInfobox = [], divergentes = [], conferidas = [];

for (const [id, s] of Object.entries(SPELLS)) {
  const w = await doWiki(s.name);
  if (!w) { inexistentes.push(`${id.padEnd(22)} "${s.name}"`); continue; }
  if (w.semInfobox) { semInfobox.push(`${id.padEnd(22)} "${s.name}"`); continue; }
  conferidas.push(id);
  const d = [];
  if (w.vocs.length) {
    const nossa = [...s.voc].sort().join(',');
    const real = [...w.vocs].sort().join(',');
    if (nossa !== real) {
      const sobrando = s.voc.filter(v => !w.vocs.includes(v));
      const faltando = w.vocs.filter(v => !s.voc.includes(v));
      d.push(`vocação: nossa [${nossa}] vs wiki [${real}]`
        + (sobrando.length ? ` · LIBERADA A MAIS pra ${sobrando.join('/')}` : '')
        + (faltando.length ? ` · falta ${faltando.join('/')}` : ''));
    }
  }
  if (w.nivel != null && w.nivel !== s.level) d.push(`nível ${s.level} vs wiki ${w.nivel}`);
  if (w.mana != null && s.mana && w.mana !== s.mana) d.push(`mana ${s.mana} vs wiki ${w.mana}`);
  if (w.words && w.words !== s.words) d.push(`palavras "${s.words}" vs wiki "${w.words}"`);
  if (d.length) divergentes.push(`${s.name.padEnd(26)} ${d.join(' | ')}`);
}

const cab = t => `\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`;
console.log(`catálogo: ${Object.keys(SPELLS).length} magias · conferidas no wiki: ${conferidas.length}`);
console.log(cab(`NÃO EXISTEM no TibiaWiki — nome errado ou inventada (${inexistentes.length})`));
inexistentes.forEach(l => console.log('  ' + l));
console.log(cab(`Página existe mas NÃO é de magia (${semInfobox.length})`));
semInfobox.forEach(l => console.log('  ' + l));
console.log(cab(`DIVERGENTES (${divergentes.length})`));
divergentes.forEach(l => console.log('  ' + l));
