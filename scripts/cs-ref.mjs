// Leitor da REFERÊNCIA local do Crystal Server (reference/crystalserver, clone
// gitignored). Substitui as idas ao TibiaWiki por HTTP: os arquivos de monstro
// (.lua), items.xml e vocations.xml são a FONTE que o próprio wiki documenta, e
// estão à mão. Ver memory: fonte-monk-crystalserver.
//
// Só parsing puro de texto — nenhuma execução de Lua. Regex sobre campos de
// formato estável (Game.createMonsterType, monster.health, monster.loot, ...).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'reference/crystalserver';
export const REF_OK = existsSync(RAIZ);

// ---- items.xml: id -> nome ----------------------------------------------
let _itemNome = null;
export function itemNomePorId(id) {
  if (!_itemNome) {
    _itemNome = new Map();
    const xml = readFileSync(join(RAIZ, 'data/items/items.xml'), 'utf8');
    // Cada tag <item ...> — id e name podem vir em QUALQUER ordem, com outros
    // atributos no meio (article="a", plural=...). Casar "id=...name=" direto
    // (regex ingênua) perdia todo item com article/plural — foi o que fez o loot
    // por `id=` não resolver e inflar "alucinado"/"faltando" na auditoria.
    const tagRe = /<item\s+([^>]*?)\/?>/g;
    let m;
    while ((m = tagRe.exec(xml))) {
      const attrs = m[1];
      const id = (attrs.match(/\bid="(\d+)"/) || [])[1];
      const nome = (attrs.match(/\bname="([^"]+)"/) || [])[1];
      if (id && nome && !_itemNome.has(Number(id))) _itemNome.set(Number(id), nome);
    }
    // ids em faixa (fromid/toid) — raros no loot, ignorados de propósito
  }
  return _itemNome.get(Number(id)) || null;
}

// ---- items.xml: nome(lower) -> { armor, defense, attack } ----------------
let _itemAttr = null;
export function itemAtributos(nome) {
  if (!_itemAttr) {
    _itemAttr = new Map();
    const xml = readFileSync(join(RAIZ, 'data/items/items.xml'), 'utf8');
    // Cada bloco <item ...> ... </item> (ou auto-fechado). Pega o nome do
    // cabeçalho e os <attribute key=.. value=..> internos.
    const blocoRe = /<item\s+([^>]*?)(\/>|>([\s\S]*?)<\/item>)/g;
    let m;
    while ((m = blocoRe.exec(xml))) {
      const cab = m[1];
      const corpo = m[3] || '';
      const nomeItem = (cab.match(/\bname="([^"]+)"/) || [])[1];
      if (!nomeItem) continue;
      const attr = k => {
        const a = corpo.match(new RegExp('key="' + k + '"\\s+value="([^"]+)"'));
        return a ? Number(a[1]) : null;
      };
      const chave = nomeItem.toLowerCase();
      if (!_itemAttr.has(chave)) _itemAttr.set(chave, { armor: attr('armor'), defense: attr('defense'), attack: attr('attack') });
    }
  }
  return _itemAttr.get(String(nome).toLowerCase()) || null;
}

// ---- índice de monstros: nome(lower) -> caminho do .lua ------------------
let _monIndex = null;
function indexMonstros() {
  if (_monIndex) return _monIndex;
  _monIndex = new Map();
  const base = join(RAIZ, 'data-global/monster');
  (function varre(dir) {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) varre(p);
      else if (n.endsWith('.lua')) {
        const txt = readFileSync(p, 'utf8');
        const mm = txt.match(/createMonsterType\("([^"]+)"\)/);
        if (mm) {
          const chave = mm[1].toLowerCase();
          if (!_monIndex.has(chave)) _monIndex.set(chave, p);
        }
      }
    }
  })(base);
  return _monIndex;
}

const num = (txt, campo) => {
  const m = txt.match(new RegExp('monster\\.' + campo + '\\s*=\\s*(-?\\d+)'));
  return m ? Number(m[1]) : null;
};

// Extrai o BLOCO { ... } de um campo (loot/attacks/defenses), casando chaves.
function bloco(txt, campo) {
  const i = txt.indexOf('monster.' + campo);
  if (i < 0) return null;
  const ini = txt.indexOf('{', i);
  if (ini < 0) return null;
  let prof = 0;
  for (let k = ini; k < txt.length; k++) {
    if (txt[k] === '{') prof++;
    else if (txt[k] === '}') { prof--; if (prof === 0) return txt.slice(ini, k + 1); }
  }
  return null;
}

// Parseia uma linha de loot: { name = "x", chance = N, maxCount = M } ou { id = N, ... }
function parseLoot(blocoTxt) {
  if (!blocoTxt) return [];
  const linhas = blocoTxt.match(/\{[^{}]*\}/g) || [];
  const out = [];
  for (const l of linhas) {
    const nome = (l.match(/name\s*=\s*"([^"]+)"/) || [])[1];
    const id = (l.match(/\bid\s*=\s*(\d+)/) || [])[1];
    const chance = Number((l.match(/chance\s*=\s*(\d+)/) || [])[1] || 0);
    const maxCount = Number((l.match(/maxCount\s*=\s*(\d+)/) || [])[1] || 1);
    const resolved = nome || (id ? itemNomePorId(id) : null);
    if (resolved) out.push({ nome: resolved.toLowerCase(), chancePct: chance / 100000, maxCount, idBruto: id ? Number(id) : null });
  }
  return out;
}

// Retorna a referência de um monstro pelo NOME (como está no nosso bestiário),
// ou null se o Crystal Server não tem esse monstro (criatura de RubinOT/licença
// criativa — NÃO é erro, é "sem fonte pra comparar").
export function monstroRef(nome) {
  const p = indexMonstros().get(String(nome).toLowerCase());
  if (!p) return null;
  const txt = readFileSync(p, 'utf8');
  const lootBloco = bloco(txt, 'loot');
  const loot = parseLoot(lootBloco);
  const gold = loot.find(l => /gold coin/i.test(l.nome));
  const atkBloco = bloco(txt, 'attacks') || '';
  // maior maxDamage de melee (vem negativo no source)
  let meleeMax = null;
  const melee = atkBloco.match(/name\s*=\s*"melee"[^}]*maxDamage\s*=\s*(-?\d+)/);
  if (melee) meleeMax = Math.abs(Number(melee[1]));
  const defBloco = bloco(txt, 'defenses') || '';
  const armor = Number((defBloco.match(/armor\s*=\s*(\d+)/) || [])[1] || 0);
  const defesa = Number((defBloco.match(/defense\s*=\s*(\d+)/) || [])[1] || 0);

  return {
    caminho: p,
    hp: num(txt, 'health') ?? num(txt, 'maxHealth'),
    xp: num(txt, 'experience'),
    speed: num(txt, 'speed'),
    goldMax: gold ? gold.maxCount : 0,
    armor, defesa, meleeMax,
    // loot sem o gold (gold é tratado à parte, vira o campo gold:[min,max])
    loot: loot.filter(l => !/gold coin/i.test(l.nome)),
  };
}

export function temReferencia() { return REF_OK; }
