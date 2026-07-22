// CORRIGE o valor de venda dos itens pelo npcvalue do TibiaWiki.
//
// Só mexe onde o wiki tem npcvalue > 0. Item com npcvalue 0 significa "NÃO
// vendável a NPC" no Tibia, não "vale zero" — e neste jogo todo item precisa
// de preço pro auto-vender funcionar. Zerar os 107 desse grupo trocaria um erro
// por outro, então ficam como decisão de design nossa.
//
// Os 371 restantes são dado errado, não design: 83 inflados (throwing_knife
// 1638 vs 2, staff 780 vs 1, swampling_club 7626 vs 40) e 288 baratos demais
// SEM padrão — razão mediana 0,096, espalhada de 0,03 a 0,29, e só 5% perto de
// metade. Regra de design deixaria proporção constante; isto é ruído.
//
// A linha do item é localizada por BUSCA DIRETA, não por regex ancorada: a
// versão com ^...$ falhou nos 371 de uma vez, e "falhou em tudo" é sintoma de
// ferramenta quebrada, não de dado ruim.
//
// Uso: node scripts/fix-venda.mjs [--aplicar]
import { readFileSync, writeFileSync } from 'node:fs';

const APLICAR = process.argv.includes('--aplicar');
const r = JSON.parse(readFileSync('scripts/venda-auditoria.json', 'utf8'));
const corrigir = r.divergentes.filter(d => d.real > 0);

let src = readFileSync('src/domain/items.js', 'utf8');
const feitos = [], falhou = [];

for (const d of corrigir) {
  const marca = '\n  ' + d.id + ':';
  const ini = src.indexOf(marca);
  if (ini < 0) { falhou.push(`${d.id} (não encontrado)`); continue; }
  const fim = src.indexOf('\n', ini + 1);
  const linha = src.slice(ini + 1, fim);
  const nova = linha.replace(/(\bsell:\s*)\d+/, '$1' + d.real);
  if (nova === linha) { falhou.push(`${d.id} (sem campo sell na linha)`); continue; }
  src = src.slice(0, ini + 1) + nova + src.slice(fim);
  feitos.push(`${d.id}: ${d.nosso} -> ${d.real}`);
}

console.log(`itens com npcvalue real: ${corrigir.length} · corrigidos: ${feitos.length} · falharam: ${falhou.length}`);
feitos.slice(0, 20).forEach(l => console.log('  ~ ' + l));
if (feitos.length > 20) console.log(`  ... e mais ${feitos.length - 20}`);
falhou.slice(0, 10).forEach(l => console.log('  ! ' + l));
console.log(`\nNÃO mexidos (npcvalue 0 = não vendável a NPC): ${r.divergentes.length - corrigir.length}`);

if (APLICAR) { writeFileSync('src/domain/items.js', src); console.log('\nGRAVADO'); }
else console.log('\n(simulação — rode com --aplicar)');
