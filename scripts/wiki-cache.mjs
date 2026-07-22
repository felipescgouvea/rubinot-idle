// Cache local das páginas de criatura do TibiaWiki.
//
// Três trabalhos usam o MESMO texto (auditoria de loot, auditoria de stats e a
// correção em lote). Sem cache seriam ~900 requisições e três chances de o
// resultado divergir entre elas por uma edição no wiki no meio do caminho —
// duas auditorias discordando sem que nada no jogo tenha mudado.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'scripts/.wiki-cache';
mkdirSync(DIR, { recursive: true });

const arquivo = nome => join(DIR, nome.replace(/[^a-z0-9]/gi, '_') + '.txt');

export async function paginaWiki(nome, { forcar = false } = {}) {
  const f = arquivo(nome);
  if (!forcar && existsSync(f)) {
    const t = readFileSync(f, 'utf8');
    return t === '__SEM_PAGINA__' ? null : t;
  }
  const url = 'https://tibia.fandom.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles='
    + encodeURIComponent(nome);
  for (let tent = 0; tent < 3; tent++) {
    try {
      const j = await fetch(url).then(r => r.json());
      const pages = j && j.query && j.query.pages;
      if (!pages) throw new Error('sem pages');
      const k = Object.keys(pages)[0];
      if (k === '-1' || !pages[k].revisions) { writeFileSync(f, '__SEM_PAGINA__'); return null; }
      const txt = pages[k].revisions[0]['*'];
      writeFileSync(f, txt);
      return txt;
    } catch { await new Promise(r => setTimeout(r, 700)); }
  }
  return null;   // falha de rede NÃO vira cache negativo
}

// Campo simples do infobox.
export function campo(txt, nome) {
  const m = txt.match(new RegExp('\\|\\s*' + nome + '\\s*=\\s*([^\\n|]+)', 'i'));
  return m ? m[1].trim() : null;
}
export function numero(txt, nome) {
  const v = campo(txt, nome);
  if (!v) return null;
  const n = v.replace(/[,.]/g, '').match(/\d+/);
  return n ? Number(n[0]) : null;
}

// Dano máximo: o infobox traz {{Max Damage|physical=110|fire=50}}. O total é a
// soma dos componentes — é o que corresponde ao nosso `atk`.
export function maxDano(txt) {
  const m = txt.match(/\{\{Max Damage\|([^}]*)\}\}/i);
  if (!m) {
    // Sem Max Damage, cai pro alcance do melee em abilities.
    const mel = txt.match(/\{\{Melee\|(\d+)-(\d+)/i);
    return mel ? Number(mel[2]) : null;
  }
  let total = 0, achou = false;
  for (const par of m[1].split('|')) {
    const [, v] = par.split('=');
    const n = v && v.replace(/[,.]/g, '').match(/\d+/);
    if (n) { total += Number(n[0]); achou = true; }
  }
  return achou ? total : null;
}

// Itens do Loot Table, com a raridade declarada.
export function lootWiki(txt) {
  const itens = [];
  let gold = null;
  for (const m of txt.matchAll(/\{\{Loot Item\|([^}]*)\}\}/gi)) {
    const partes = m[1].split('|').map(x => x.trim()).filter(Boolean);
    const qtd = /^\d+(-\d+)?$/.test(partes[0]) ? partes.shift() : null;
    const nome = partes[0];
    if (!nome) continue;
    const raridade = (partes[1] || '').toLowerCase();
    if (/^gold coin$/i.test(nome)) {
      const f = (qtd || '0').split('-');
      gold = [Number(f[0]) || 0, Number(f[1] != null ? f[1] : f[0]) || 0];
      continue;
    }
    itens.push({ nome, raridade, qtd });
  }
  return { itens, gold };
}

// Raridade do TibiaWiki -> chance. A classificação vem da própria wiki
// (Loot Statistics): always=100%, common>5%, uncommon 1-5%, semi-rare 0.5-1%,
// rare 0.1-0.5%, very rare <0.1%. Usamos o meio de cada faixa; é a tradução
// mais fiel possível de uma classe pra um número, e fica DOCUMENTADA aqui em
// vez de virar chute item a item.
export const CHANCE_POR_RARIDADE = {
  always: 1, common: 0.15, uncommon: 0.03, 'semi-rare': 0.0075,
  rare: 0.003, 'very rare': 0.0008,
};
export function chanceDe(raridade) {
  return CHANCE_POR_RARIDADE[raridade] != null ? CHANCE_POR_RARIDADE[raridade] : 0.03;
}
