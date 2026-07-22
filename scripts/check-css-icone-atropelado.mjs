// Guarda ESTÁTICO contra a regra de tamanho de ícone que não vale.
//
// `img.tibia-icon` tem especificidade 0-1-1 e é aplicada a TODO ícone de sprite
// (ver infrastructure/tibiaSprites.js: spriteImgOrFallback). Uma classe de
// componente sozinha — `.meu-icone { width: 40px }` — tem 0-1-0 e PERDE, não
// importa a ordem no arquivo. O tamanho declarado vira decoração: o ícone sai
// com `height: 1.3em; width: auto`.
//
// É um defeito mudo. Nada quebra, nada aparece no console; o ícone só fica do
// tamanho errado. Achei sete assim, um de cada vez, conforme o painel dono da
// classe aparecia na tela durante outra auditoria. Este guarda olha o CSS
// inteiro de uma vez, sem depender de sorte de renderização.
//
// Uso: node scripts/check-css-icone-atropelado.mjs
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('style.css', 'utf8');

// Classes passadas como `cls` pros helpers de sprite — é o que ganha tibia-icon.
const fontes = [];
(function varrer(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) varrer(p);
    else if (n.endsWith('.js')) fontes.push(readFileSync(p, 'utf8'));
  }
})('src');
const usadasComoIcone = new Set();
for (const src of fontes) {
  // ...Img(algo, 'classe')  /  ...Img(a, b, 'classe')
  for (const m of src.matchAll(/Img\s*\([^)]*?['"]([a-z0-9-]+)['"]\s*\)/gi)) usadasComoIcone.add(m[1]);
  for (const m of src.matchAll(/spriteImgOrFallback\s*\([^)]*?['"]([a-z0-9-]+)['"]\s*\)/gi)) usadasComoIcone.add(m[1]);
}

// Regras `.foo { ... }` (uma classe só, sem elemento) que declaram tamanho.
const suspeitas = [];
// Casa QUALQUER bloco `seletor { corpo }` sem depender do que vem antes dele.
// A primeira versão ancorava em `(^|\})`, então uma regra só era vista se a
// anterior terminasse do jeito esperado — e ela ESCONDEU duas classes na
// primeira rodada, aparecendo só depois que uma edição mudou a vizinhança.
// Guarda que depende de formatação não é guarda.
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].split('\n').map(l => l.replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean).join(' ').trim();
  const corpo = m[2];
  if (!sel || sel.startsWith('@')) continue;
  if (!/(^|[\s,])\.[a-z0-9-]+$/i.test(sel)) continue;   // exatamente uma classe, sem tag
  if (!/(^|;|\s)(width|height)\s*:/.test(corpo)) continue;
  const classe = sel.replace(/^\./, '');
  if (!usadasComoIcone.has(classe)) continue;
  // já existe a variante com img.? então está resolvida
  const temImg = new RegExp(`img\\.${classe.replace(/[-]/g, '\\-')}\\s*[,{]`).test(css);
  if (!temImg) suspeitas.push(classe);
}

console.log(`classes usadas como ícone: ${usadasComoIcone.size} · com regra de tamanho sem \`img.\`: ${suspeitas.length}`);
suspeitas.forEach(c => console.log(`  ✗ .${c} declara tamanho, mas img.tibia-icon (0-1-1) vence — o tamanho não vale`));

if (suspeitas.length) {
  console.log('\nConserto: mover só width/height pra uma regra `img.<classe>` DEPOIS de img.tibia-icon.');
  console.log('O resto (posição, moldura, vertical-align) fica na classe sem `img.`, pra seguir valendo no <span> do fallback de emoji.');
  console.log(`\nRESULTADO: FALHOU — ${suspeitas.length} regra(s) de tamanho sem efeito`);
  process.exitCode = 1;
} else {
  console.log('\nRESULTADO: PASSOU — nenhum tamanho de ícone atropelado');
}
