// Guarda contra sprite de monstro ANIMADO que não faz loop infinito.
//
// Um WebP animado com loopCount != 0 (no chunk ANIM) toca a animação UMA vez e
// CONGELA no último frame — o bicho aparece estático em batalha depois de ~0,6s.
// Foi o que aconteceu com 263 sprites vindos do catálogo (loopCount=1), 120
// deles usados em hunt (reportado pelo Felipe: "alguns monstros voltaram a
// ficar estáticos"). O fix é loopCount=0 (infinito). Esta guarda relê os bytes e
// falha se algum voltar com loop != 0 (ex.: novo batch de catálogo mal-encodado).
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'assets/sprites/monsters';
const files = readdirSync(dir).filter(f => f.endsWith('.webp'));
const ruins = [];
for (const f of files) {
  const buf = readFileSync(`${dir}/${f}`);
  const i = buf.indexOf(Buffer.from('ANIM'));
  if (i < 0) continue; // estático de verdade (sem chunk ANIM) — ok, não é animado
  const loop = buf.readUInt16LE(i + 12); // ANIM(4)+size(4)+bg(4) -> loopCount(2 LE)
  if (loop !== 0) ruins.push(`  ${f}: loopCount=${loop} (deveria ser 0/infinito)`);
}

console.log(`webp de monstro: ${files.length} | animados com loop != 0: ${ruins.length}`);
if (ruins.length) {
  console.log(`\nSPRITES QUE CONGELAM (tocam 1x e param):\n${ruins.slice(0, 60).join('\n')}`);
  if (ruins.length > 60) console.log(`  … e mais ${ruins.length - 60}`);
  console.log('\nRESULTADO: FALHOU — rode o patch de loop (scripts/scratchpad) e bumpe MONSTER_SPRITE_VER');
  process.exit(1);
}
console.log('\nRESULTADO: PASSOU (todo sprite animado faz loop infinito)');
