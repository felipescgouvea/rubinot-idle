// Guarda contra um bug silencioso e traiçoeiro: todo import do jogo é
// versionado (`?v=N`), e o navegador trata CADA URL como um módulo separado.
// Se um arquivo importa `gameStore.js?v=170` enquanto o resto do app importa
// `?v=171`, ele recebe uma SEGUNDA INSTÂNCIA do módulo — com estado zerado.
//
// Foi exatamente isso que fez o boneco sumir do palco de treino: trainingStage.js
// nasceu com a versão escrita à mão uma atrás e passou a ler um G vazio (vocação
// null, equipamento null). Não dá erro, não dá 404, não aparece no console —
// simplesmente lê estado errado. E o bump-versions.mjs não conserta: ele
// INCREMENTA o que já está lá, então quem nasce desalinhado fica desalinhado.
//
// Um módulo SEM estado (só funções/tabelas puras) tolera duplicata: a segunda
// cópia é idêntica. O que quebra é duplicar quem guarda estado vivo — por isso
// só esses são ERRO; o resto é aviso.
//
// O servidor fica de fora: é outro runtime (Node), com seu próprio grafo.
import { readFileSync, globSync } from 'node:fs';

// Módulos com estado mutável no topo — duplicar qualquer um destes corrompe o jogo.
const COM_ESTADO = new Set([
  'gameStore.js',        // G e ACCOUNT (o estado do jogo inteiro)
  'eventBus.js',         // registro de listeners
  'i18n.js',             // idioma atual + dicionário carregado
  'huntUseCases.js',     // sessão de caçada, timers, pack atual
  'trainingUseCases.js', // loop e contadores do treino
  'preyUseCases.js',
  'tibiaSprites.js',     // cache de sprites que já falharam
  'adminUseCases.js',
  'saveGameUseCase.js',
  'authClient.js',       // sessão viva (token/refresh) + trava de leitura da nuvem — duplicar desloga no meio e bloqueia save
  'notifyTitle.js',      // Set de flags de "tem coisa pra resgatar" que dita o título da aba
]);

const RE = /from '([^']*\/([\w.-]+\.js))\?v=(\d+)'/g;
const arquivos = globSync('src/**/*.js');
const votos = new Map();
const usos = [];

for (const f of arquivos) {
  for (const m of readFileSync(f, 'utf8').matchAll(RE)) {
    const alvo = m[2], versao = +m[3];
    if (!votos.has(alvo)) votos.set(alvo, new Map());
    const c = votos.get(alvo);
    c.set(versao, (c.get(versao) || 0) + 1);
    usos.push({ origem: f, alvo, versao });
  }
}

const majoritaria = new Map();
for (const [alvo, c] of votos) majoritaria.set(alvo, [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]);

const fora = usos.filter(u => u.versao !== majoritaria.get(u.alvo));
const graves = fora.filter(u => COM_ESTADO.has(u.alvo));
const avisos = fora.filter(u => !COM_ESTADO.has(u.alvo));

console.log(`imports analisados: ${usos.length} | módulos: ${votos.size}`);
if (avisos.length) {
  console.log(`\navisos (módulo sem estado, duplicata é inofensiva) — ${avisos.length}:`);
  for (const u of avisos.slice(0, 12)) console.log(`  ${u.origem}: ${u.alvo}?v=${u.versao} (maioria: ${majoritaria.get(u.alvo)})`);
  if (avisos.length > 12) console.log(`  … e mais ${avisos.length - 12}`);
}
if (graves.length) {
  console.log(`\nERRO — módulo COM ESTADO importado em versão divergente (${graves.length}):`);
  for (const u of graves) console.log(`  ${u.origem}: ${u.alvo}?v=${u.versao}  ->  deve ser ?v=${majoritaria.get(u.alvo)}`);
  console.log('\nRESULTADO: FALHOU');
  process.exit(1);
}
console.log('\nRESULTADO: PASSOU (nenhum módulo com estado duplicado)');
