# Objetivo

## Qual necessidade o Rubinot Idle resolve

Jogo idle/incremental de navegador no universo de **RubinOT** (servidor privado de **Tibia**). Dá a fãs uma forma de reviver a progressão do original — caçar, evoluir a vocação, cumprir tarefas, disputar ranking — em sessões de segundos, com progresso continuando offline.

Promessa central: **fidelidade ao universo de Tibia/RubinOT**. Criaturas, magias, vocações, fórmulas de combate, tasks e loja são reconhecíveis por quem jogou o original. É "o Tibia/RubinOT, em versão idle" — nada de nomes inventados.

## Quem usa

- **Jogador** — acessa pelo navegador. Acesso exige **conta (e-mail e senha)**: progresso salvo na nuvem e vinculado à conta, para não se perder e valer no ranking global. Uma conta pode ter mais de um personagem.
- **Operador/dono** — administra balanceamento, economia e disponibilidade de funcionalidades por painel restrito (ver [25-admin/](25-admin/admin.md)).

## Resultado esperado

- Jogador de Tibia reconhece sem explicação: vocações e promoção, nomes e sprites das criaturas, palavras mágicas das spells, skills que sobem por uso, Linked Tasks e a lógica da loja.
- Jogador novo progride sozinho: a curva de dificuldade guia as escolhas (zona, vocação, equipamento) e nunca trava de forma permanente.

## Como esta especificação está organizada

- **Raiz** — fundamentos e sistemas que não são abas da barra lateral (objetivo, glossário, personagem, conta, inventário, configurações, persistência, recompensa diária, presas, conquistas) e as regras/critérios transversais.
- **Uma pasta por item da barra lateral** (`10-caca/`, `11-rtc/`, … `25-admin/`).
- [README.md](README.md) é o índice navegável.
