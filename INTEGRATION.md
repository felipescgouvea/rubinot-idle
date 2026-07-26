# Trabalho em paralelo — worktree por agente + integrador único

Como rodar **N agentes ao mesmo tempo** neste repo (implementar, corrigir, testar) sem um travar/pisar no outro.

## Por que colide (as duas fontes)

1. **A cascata de versão reescreve TODO o `src/`.** `scripts/bump-versions.mjs` dá `+1` em cada `?v=N` de todos os `.js` + `index.html`. Qualquer mudança de código, por menor que seja, toca todo arquivo versionado — então "commitar só o meu" é impossível se outro agente tem `src/` sujo na árvore.
2. **Alvo único:** um só `main`, um só GitHub Pages (cliente), um só Railway (servidor), uma só conta de teste (`.test-account.json`). Push/teste simultâneo = corrida.

## O modelo

```
agente A (worktree + branch agent/a) ─┐  cada um: implementa → verifica LOCAL →
agente B (worktree + branch agent/b) ─┼─ commita SÓ a mudança lógica na sua branch
agente C (worktree + branch agent/c) ─┘  (NÃO bumpa, NÃO pusha, NÃO deploya)
                                          │
              integrador (main) ──────────┘  merge das branches → bump-versions 1×
                                             → guards → 1 push → 1 deploy → testa em prod
```

**Chave:** os agentes **não rodam `bump-versions`**. Assim as branches diferem de `main` só nos arquivos de lógica que mudaram (sem churn de `?v=`), e o merge de lanes disjuntas é **sem conflito**. O bump global roda **uma vez só, no integrador**, e vira o passo de normalização em vez de gerador de conflito.

---

## Setup: uma worktree por agente

Da raiz do repo (`c:\workspace\rubinot-idle`), na `main` limpa:

```bash
git worktree add ../rubinot-idle-A -b agent/A   # cria dir irmão + branch
git worktree add ../rubinot-idle-B -b agent/B
```

Cada agente trabalha **dentro do seu diretório** (`../rubinot-idle-A`, ...). O `.git` é compartilhado, mas o working tree é isolado — o bump de um não toca no `src/` do outro.

> Via tooling: `Agent(..., isolation: "worktree")` já cria uma worktree efêmera por agente automaticamente. Este doc é pra quando você orquestra na mão.

## Lanes (pra os merges serem limpos)

Divida o trabalho por subsistema pra os agentes editarem arquivos **disjuntos**:

| Lane | Toca | Não toca |
|---|---|---|
| **server** | `server/` | `src/` |
| **ui** | `src/ui/`, `style.css` | `server/`, `src/domain/` |
| **conteúdo/dados** | `src/domain/`, `scripts/*.mjs` de dados | `src/ui/`, `server/` |
| **economia** *(só o Felipe)* | — | — |

Arquivos compartilhados que quase todo mundo mexe (`BACKLOG.md`, `finished.md`) → ver "conflitos" abaixo.

## Regras do AGENTE (dentro da worktree)

1. **Implementa** a mudança na sua lane, no estilo do código ao redor.
2. **Verifica LOCAL** (não deploya pra testar):
   - guards: `node scripts/check-import-versions.mjs`, `npm run check:imports`, guards de i18n;
   - lógica: probe headless que importa o módulo direto (sem browser);
   - visual/FX/sprite: sobe um static server só seu numa porta única e roda Playwright contra `localhost` (browser real, isolado) — **não** contra prod.
     ```bash
     python -m http.server 8081   # porta diferente por agente
     ```
3. **Commita SÓ os arquivos que modificou**, por caminho explícito. **Nunca** `git add -A`/`.`.
4. **NÃO roda `bump-versions`. NÃO faz `push`. NÃO faz `railway up`.** Isso é do integrador.
5. `finished.md` / `defects.md` são **locais** (gitignorados) — cada worktree tem o seu.
6. Marca o item no `BACKLOG.md` na sua branch (o integrador reconcilia).

## Passo do INTEGRADOR (na `main`)

Quando as branches estiverem prontas, na raiz principal com a `main` limpa:

```bash
node scripts/integrate.mjs agent/A agent/B agent/C            # merge + bump + guards
node scripts/integrate.mjs agent/A agent/B agent/C --push     # + push (deploy do cliente)
```

O script: valida `main` limpa → faz merge de cada branch (**aborta em conflito real**, listando os arquivos) → roda `bump-versions` **1×** → roda os guards → commita o bump → (com `--push`) empurra.

Depois do push:
- **Servidor mudou?** `railway up` (da raiz — nunca de dentro de `server/`).
- **Valida em produção** (github.io): rode os probes críticos contra prod.
- Limpe as worktrees: `git worktree remove ../rubinot-idle-A`.

## Conflitos

- **Lanes disjuntas** → sem conflito (arquivos diferentes).
- **`BACKLOG.md`** (todos marcam item feito) → conflito de linha, trivial: aceite as duas marcações (`git checkout --union` ou resolva na mão).
- **`?v=` em massa** → só acontece se um agente rodou `bump-versions` sem querer (contra a regra). Como os números são descartáveis: `git checkout --theirs . && git add . && git commit`, e o `bump-versions` do integrador normaliza tudo depois. Nunca é perda de lógica, só de numeração de cache.

## Teste sem interferir

- **Agente:** browser local (`localhost` na porta dele) — isolado, não toca prod nem a conta compartilhada.
- **Integrador:** único deploy → valida em prod. Se precisar de probes em paralelo em prod, use **um slot/conta de teste por agente** em vez do único slot 2.
