// Marca no catálogo (scripts/hunting-places.json) as áreas já reproduzidas no
// jogo, para o artefato de seleção parar de mostrá-las. A lista de "prontas"
// sai de scripts/zones-done.json: { "Cidade": ["Nome da área", ...] }.
import { readFileSync, writeFileSync } from 'node:fs';
const prontas = JSON.parse(readFileSync('scripts/zones-done.json', 'utf8'));
const areas = JSON.parse(readFileSync('scripts/hunting-places.json', 'utf8'));
let marcadas = 0;
const naoAchadas = [];
for (const [cidade, nomes] of Object.entries(prontas)) {
  for (const nome of nomes) {
    const a = areas.find(x => x.cidade === cidade && x.nome === nome);
    if (!a) { naoAchadas.push(`${cidade} / ${nome}`); continue; }
    a.feita = true; marcadas++;
  }
}
writeFileSync('scripts/hunting-places.json', JSON.stringify(areas, null, 1));
console.log(`marcadas como feitas: ${marcadas}`);
if (naoAchadas.length) console.log('NÃO encontradas (confira o nome exato):\n - ' + naoAchadas.join('\n - '));
console.log(`restam para escolher: ${areas.filter(a => !a.feita).length} de ${areas.length}`);
