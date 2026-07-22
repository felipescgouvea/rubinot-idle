// Acha função USADA dentro de um módulo mas nunca IMPORTADA — a classe de bug
// que quebrou o RTC duas vezes seguidas ("tiers is not defined" e o botão Usar
// que não fazia nada, porque setRtcHealTierSpell nunca foi importada).
//
// É invisível pra tudo o mais: `node --check` só valida sintaxe, e o erro só
// aparece quando o jogador clica no caminho exato. Aqui a checagem é estática e
// roda em segundos.
//
// Uso: node scripts/check-imports-faltando.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PASTAS = ['src/ui', 'src/application', 'src/domain', 'src/infrastructure'];

// Tudo que cada arquivo EXPORTA como função/const
const exportsPorArquivo = new Map();
const arquivos = [];
for (const pasta of PASTAS) {
  for (const f of readdirSync(pasta)) {
    if (!f.endsWith('.js')) continue;
    const caminho = join(pasta, f).split('\\').join('/');
    arquivos.push(caminho);
    const src = readFileSync(caminho, 'utf8');
    const nomes = new Set();
    for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) nomes.add(m[1]);
    for (const m of src.matchAll(/^export\s+(?:const|let)\s+(\w+)/gm)) nomes.add(m[1]);
    exportsPorArquivo.set(f, nomes);
  }
}

const achados = [];
for (const caminho of arquivos) {
  const src = readFileSync(caminho, 'utf8');
  // o que este arquivo já tem no escopo: imports + declarações locais
  const noEscopo = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const parte of m[1].split(',')) {
      const nome = parte.trim().split(/\s+as\s+/).pop().trim();
      if (nome) noEscopo.add(nome);
    }
  }
  for (const m of src.matchAll(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)) noEscopo.add(m[1]);
  for (const m of src.matchAll(/^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)/gm)) noEscopo.add(m[1]);
  // Import DINÂMICO com desestruturação — o padrão usado pra quebrar
  // dependência circular: `const { applyImbuement } = await import('...')`.
  for (const m of src.matchAll(/(?:const|let)\s*\{([^}]*)\}\s*=\s*await\s+import\s*\(/g)) {
    for (const parte of m[1].split(',')) {
      const nome = parte.trim().split(/[:\s]+/).pop().trim();
      if (nome) noEscopo.add(nome);
    }
  }

  // Tira os HANDLERS INLINE (onclick="fn(...)"). Eles resolvem em tempo de
  // execução pelo window — main.js expõe tudo lá — e são o padrão do projeto,
  // não erro. Sem esta limpeza o teste acusava 67 falsos positivos e viraria
  // ruído que ninguém lê.
  const HANDLER_INLINE = new RegExp(
    String.raw`\bon(?:click|change|input|submit|keyup|keydown|drop|dragover|dragstart|error|mouseenter|mouseleave|wheel)\s*=\s*` +
    String.raw`(?:"[^"]*"|'[^']*'|\x60[^\x60]*\x60)`, 'g');
  // Comentários também saem: este projeto documenta muito ("ver huntUseCases:
  // gainXp()"), e uma menção em comentário não é chamada de função.
  // `onclick=` dentro de template literal (com ${...} no meio) e
  // setAttribute('onclick', ...) também são handlers resolvidos pelo window.
  const HANDLER_SOLTO = /\bon[a-z]+\s*=\s*\\?["'][^"'\n]{0,200}?\\?["']|setAttribute\(\s*['"]on[a-z]+['"]\s*,[^)]*\)/g;
  const corpo = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/[^\n]*$/gm, '')
    .replace(/import[^;]*;/g, '')
    .replace(HANDLER_INLINE, '')
    .replace(HANDLER_SOLTO, '');

  for (const [arq, nomes] of exportsPorArquivo) {
    if (arq === caminho.split('/').pop()) continue;   // não confere consigo mesmo
    for (const nome of nomes) {
      if (noEscopo.has(nome)) continue;
      // chamada direta: `nome(` sem ponto antes (evita casar obj.nome())
      const usa = new RegExp('(^|[^\\w.])' + nome + '\\s*\\(').test(corpo);
      if (usa) achados.push(`${caminho}: usa ${nome}() (de ${arq}) e NÃO importa`);
    }
  }
}

const unicos = [...new Set(achados)];
console.log(`arquivos analisados: ${arquivos.length}`);
if (!unicos.length) console.log('\nRESULTADO: PASSOU — nenhuma função usada sem import');
else {
  console.log(`\nRESULTADO: FALHOU — ${unicos.length} uso(s) sem import`);
  unicos.forEach(l => console.log('  - ' + l));
  process.exitCode = 1;
}
