// CORRIGE atk/def dos itens pro valor REAL do Crystal Server (items.xml), que
// bate com o TibiaWiki (conferido: Longsword atk 17/def 14 nos dois). Os 234
// divergentes erram nos dois sentidos, sem escala — é ruído de dado, não
// balance. Fonte canônica = Crystal Server (ver memory: crystalserver-fonte-canonica).
//
// Localiza a linha do item por BUSCA DIRETA (mesmo padrão de fix-venda.mjs) e
// troca só o campo atk (armas) ou def (armaduras/escudos).
//
// Uso: node scripts/fix-itens-cs.mjs [--aplicar]
import { readFileSync, writeFileSync } from 'node:fs';

const APLICAR = process.argv.includes('--aplicar');
const r = JSON.parse(readFileSync('scripts/itens-cs-auditoria.json', 'utf8'));

let src = readFileSync('src/domain/items.js', 'utf8');
const feitos = [], falhou = [];

function corrige(lista, campo) {
  for (const d of lista) {
    if (d.real == null) { falhou.push(`${d.id} (real nulo)`); continue; }
    const marca = '\n  ' + d.id + ':';
    const ini = src.indexOf(marca);
    if (ini < 0) { falhou.push(`${d.id} (não encontrado)`); continue; }
    const fim = src.indexOf('\n', ini + 1);
    const linha = src.slice(ini + 1, fim);
    const re = new RegExp('(\\b' + campo + ':\\s*)-?\\d+');
    if (!re.test(linha)) { falhou.push(`${d.id} (sem campo ${campo})`); continue; }
    const nova = linha.replace(re, '$1' + d.real);
    src = src.slice(0, ini + 1) + nova + src.slice(fim);
    feitos.push(`${d.id}: ${campo} ${d.nosso} -> ${d.real}`);
  }
}

corrige(r.atk, 'atk');
corrige(r.def, 'def');

console.log(`divergentes: ${r.atk.length + r.def.length} · corrigidos: ${feitos.length} · falharam: ${falhou.length}`);
feitos.slice(0, 25).forEach(l => console.log('  ~ ' + l));
if (feitos.length > 25) console.log(`  ... e mais ${feitos.length - 25}`);
falhou.slice(0, 15).forEach(l => console.log('  ! ' + l));

if (APLICAR) { writeFileSync('src/domain/items.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar)');
