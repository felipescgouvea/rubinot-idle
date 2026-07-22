// Bump global de cache-busting: +1 em cada ?v=N nos imports de src/ e no
// index.html. Preserva a versão por-módulo (só incrementa), garantindo que
// todo cliente recarregue e veja conteúdo novo de forma consistente.
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
import { readdirSync, statSync } from 'node:fs';
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (e.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = [...walk(join(ROOT, 'src')), join(ROOT, 'index.html')];
let total = 0, touched = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let n = 0;
  const out = src.replace(/\?v=(\d+)/g, (_, v) => { n++; return `?v=${Number(v) + 1}`; });
  if (n > 0) { writeFileSync(f, out); total += n; touched++; }
}
console.log(`bump: ${total} ocorrências em ${touched} arquivos`);


// As tags <link rel="modulepreload"> do index.html carregam a URL COM ?v=;
// se ficassem pra tras depois de um bump, o navegador baixaria cada modulo DUAS
// vezes (a versao velha do preload e a nova do import). Regenerar aqui e o que
// mantem as duas listas em sincronia.
await import('./gen-modulepreload.mjs');
