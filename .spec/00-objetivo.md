# Objetivo

## Qual necessidade o Rubinot Idle resolve

Rubinot Idle é um jogo idle/incremental de navegador ambientado no universo de **RubinOT**, um servidor privado baseado no MMORPG **Tibia**. Ele existe para dar a fãs de Tibia/RubinOT uma forma de reviver a progressão do jogo original — caçar criaturas, evoluir a vocação, cumprir tarefas, disputar ranking — de forma leve, jogável em segundos por vez, e que continua rendendo progresso mesmo com o jogador offline.

A promessa central do produto é a **fidelidade ao universo real de Tibia/RubinOT**: criaturas, magias, vocações, fórmulas de combate, sistemas de tarefas e loja devem ser reconhecíveis por quem já jogou o original. Não é uma fantasia genérica com nomes inventados — é "o Tibia/RubinOT, em versão idle".

## Quem usa

- **Jogador** — qualquer pessoa que acesse o jogo pelo navegador. O acesso exige **conta (e-mail e senha)**: o progresso é salvo na nuvem e vinculado à conta, para não se perder e para valer no ranking global. Uma conta pode ter mais de um personagem.
- **Operador/dono do jogo** — administra balanceamento, economia e disponibilidade de funcionalidades por um painel restrito (ver [25-admin/](25-admin/admin.md)).

## Resultado esperado

Um jogador familiarizado com Tibia/RubinOT reconhece, sem explicação: as vocações e sua promoção, os nomes e sprites das criaturas, as palavras mágicas das spells, as skills que sobem por uso, o conceito de Linked Tasks e a lógica da loja. Um jogador novo consegue progredir sozinho — a curva de dificuldade guia as escolhas (zona, vocação, equipamento) e nunca trava de forma permanente.

## Como esta especificação está organizada

- **Raiz** — fundamentos e sistemas que não são abas da barra lateral (objetivo, glossário, personagem, conta, inventário, configurações, persistência, recompensa diária, presas, conquistas) e as regras/critérios transversais.
- **Uma pasta por item da barra lateral do jogo** (`10-caca/`, `11-rtc/`, … `25-admin/`) — cada pasta reúne os arquivos de especificação daquele tópico.
- O [README.md](README.md) é o índice navegável.
