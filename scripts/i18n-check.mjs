// Auditoria determinística de i18n: paridade en/pt + chaves t('literal') ausentes.
// Uso: node scripts/i18n-check.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

async function load(locale) {
  const mod = await import(`../src/i18n/locales/${locale}.js?v=probe`);
  const obj = mod.default || mod[Object.keys(mod)[0]];
  const keys = new Set();
  (function walk(o, pre) {
    for (const k of Object.keys(o)) {
      const v = o[k]; const key = pre ? pre + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, key);
      else keys.add(key);
    }
  })(obj, '');
  return keys;
}
const en = await load('en'), pt = await load('pt');

const onlyEn = [...en].filter(k => !pt.has(k));
const onlyPt = [...pt].filter(k => !en.has(k));
console.log(`en: ${en.size} chaves | pt: ${pt.size} chaves`);
if (onlyEn.length) console.log(`\nSO EM EN (${onlyEn.length}): ${onlyEn.slice(0, 50).join(', ')}`);
if (onlyPt.length) console.log(`\nSO EM PT (${onlyPt.length}): ${onlyPt.slice(0, 50).join(', ')}`);

function walkFiles(dir, acc) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!/locales/.test(p)) walkFiles(p, acc); }
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}
const files = walkFiles('src', []);
const used = new Map();
const re = /\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8'); let m;
  while ((m = re.exec(src))) if (!used.has(m[1])) used.set(m[1], f);
}
const missing = [...used].filter(([k]) => !en.has(k));
console.log(`\nchaves t('literal') usadas: ${used.size}`);
if (missing.length) {
  console.log(`\nUSADAS MAS AUSENTES EM EN (${missing.length}):`);
  for (const [k, f] of missing.slice(0, 50)) console.log(`  ${k}  <- ${f.split(/[\\/]/).slice(-2).join('/')}`);
} else console.log('nenhuma chave literal ausente');
