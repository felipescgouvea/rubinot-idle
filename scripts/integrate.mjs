// Integrador único do modelo worktree-por-agente (ver INTEGRATION.md).
//
// Os agentes trabalham em worktrees/branches e commitam SÓ a lógica (sem bump,
// sem push). Este script, rodado na `main` limpa, junta tudo com segurança:
//   merge de cada branch  ->  bump-versions 1x  ->  guards  ->  commit do bump  ->  (push)
//
// Uso:
//   node scripts/integrate.mjs agent/A agent/B [...]        # integra (sem push)
//   node scripts/integrate.mjs agent/A agent/B --push       # integra e faz push
//   node scripts/integrate.mjs agent/A --dry                # só mostra o que faria
//
// Segurança: exige `main` limpa; ABORTA em conflito real (lista os arquivos e
// desfaz o merge daquela branch) — nunca resolve conflito de lógica sozinho.
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const push = args.includes('--push');
const dry = args.includes('--dry');
const branches = args.filter(a => !a.startsWith('--'));

function sh(cmd, { capture = true } = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
}
function trySh(cmd) {
  try { return { ok: true, out: sh(cmd) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
}
function die(msg) { console.error('\n❌ ' + msg); process.exit(1); }

if (!branches.length) die('uso: node scripts/integrate.mjs <branch...> [--push] [--dry]');

// 1) precisa estar na main e limpa
const cur = sh('git rev-parse --abbrev-ref HEAD').trim();
if (cur !== 'main') die(`você está em "${cur}" — rode a integração a partir da main.`);
if (sh('git status --porcelain').trim()) die('a árvore não está limpa — commite/descarte antes de integrar (o integrador precisa da main limpa).');

console.log(`Integrando ${branches.length} branch(es) na main: ${branches.join(', ')}${dry ? '  [DRY-RUN]' : ''}\n`);
if (dry) { console.log('(dry) merges + bump + guards' + (push ? ' + push' : '') + ' — nada executado.'); process.exit(0); }

// 2) merge de cada branch (aborta em conflito real)
const merged = [];
for (const br of branches) {
  process.stdout.write(`• merge ${br} … `);
  const r = trySh(`git merge --no-ff --no-edit ${br}`);
  if (r.ok) { console.log(r.out.includes('Already up to date') ? 'já estava na main' : 'ok'); merged.push(br); continue; }
  const conflicts = trySh('git diff --name-only --diff-filter=U').out.trim();
  trySh('git merge --abort');
  die(`conflito ao mesclar ${br} — merge desfeito. Resolva na mão primeiro.\nArquivos em conflito:\n${conflicts || '(desconhecido)'}\n\nDica: BACKLOG.md resolve com --union; churn de ?v= resolve com "git checkout --theirs" + re-bump (ver INTEGRATION.md).`);
}

// 3) bump global 1x
console.log('\n• bump-versions (cascata global de ?v=) …');
sh('node scripts/bump-versions.mjs', { capture: false });

// 4) guards
console.log('\n• guards …');
for (const g of ['check-import-versions.mjs', 'check-imports-faltando.mjs', 'i18n-check.mjs']) {
  const r = trySh(`node scripts/${g}`);
  const okLine = /PASSOU|paridade en\/pt OK|nenhuma/i.test(r.out);
  if (!r.ok || !okLine) die(`guard falhou: ${g}\n${r.out.slice(-1200)}\n\nO merge está feito mas o bump NÃO foi commitado — conserte e rode "git add src/ index.html && git commit".`);
  console.log(`  ✓ ${g}`);
}

// 5) commita o bump
sh('git add src/ index.html');
if (sh('git diff --cached --name-only').trim()) {
  sh(`git -c user.name=felipescgouvea -c user.email=95felipeg@gmail.com commit -q -m "chore(integracao): bump de versao pos-merge (${merged.join(', ')})"`);
  console.log('\n• bump commitado.');
} else {
  console.log('\n• nada pra bumpar (branches sem mudança de import).');
}

// 6) push opcional
if (push) {
  console.log('\n• push origin main …');
  sh('git push origin main', { capture: false });
  console.log('\n✅ Integrado e pushado. Se o servidor mudou, rode `railway up` da raiz e valide em prod.');
} else {
  console.log('\n✅ Integrado localmente (sem push). Revise com `git log --oneline` e rode com --push quando quiser deployar.');
}
