// Gera as tags <link rel="modulepreload"> do index.html.
//
// O PROBLEMA (medido em scripts/perf-load.mjs): o jogo carrega ~100 módulos
// ESM e o grafo de imports tem 11 níveis de profundidade. O navegador só
// descobre o módulo do nível N depois de baixar e analisar o do nível N-1 —
// então são 11 idas à rede EM SÉRIE antes do último módulo sequer começar a
// baixar. A ~170ms cada, isso é ~1,9s de espera pura, com a rede ociosa.
//
// A SOLUÇÃO: listar todo mundo no <head> com modulepreload. O navegador passa
// a buscar os 100 em paralelo desde o primeiro instante, e a cascata some. Não
// muda arquitetura, não exige empacotador e mantém o versionamento por ?v=
// (cada URL aqui é a MESMA que o import usa — se divergir, o navegador baixa
// duas vezes, então este script lê as versões do próprio código).
//
// Roda junto do bump de versões. Uso: node scripts/gen-modulepreload.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const ENTRADA = 'src/main.js';
const INICIO = '<!-- modulepreload:inicio -->';
const FIM = '<!-- modulepreload:fim -->';

// Percorre o grafo a partir do main.js, guardando a URL COM a versão que o
// import realmente usa.
const urls = new Map();   // caminho normalizado -> url com ?v=
const vistos = new Set();

function anda(arquivo) {
  if (vistos.has(arquivo)) return;
  vistos.add(arquivo);
  let src;
  try { src = readFileSync(arquivo, 'utf8'); } catch { return; }
  for (const m of src.matchAll(/from\s+'(\.[^']+\.js)(\?v=\d+)?'/g)) {
    const destino = normalize(join(dirname(arquivo), m[1]));
    const web = relative('.', destino).split('\\').join('/');
    // Se o mesmo módulo aparece com versões diferentes, o check-import-versions
    // já acusa; aqui fica a primeira vista, que é a que o navegador resolve.
    if (!urls.has(web)) urls.set(web, web + (m[2] || ''));
    anda(destino);
  }
}
anda(ENTRADA);

const lista = [...urls.values()].sort();
const tags = lista.map(u => `    <link rel="modulepreload" href="${u}">`).join('\r\n');

let html = readFileSync('index.html', 'utf8');
const bloco = `${INICIO}\r\n${tags}\r\n    ${FIM}`;

if (html.includes(INICIO)) {
  html = html.replace(new RegExp(`${INICIO}[\\s\\S]*?${FIM}`), bloco);
} else {
  // primeira vez: ancora logo antes do </head>
  html = html.replace(/([ \t]*)<\/head>/, `$1  ${bloco}\r\n$1</head>`);
}
writeFileSync('index.html', html);
console.log(`modulepreload: ${lista.length} módulos listados no index.html`);
