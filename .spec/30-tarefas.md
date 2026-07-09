# Tarefas (Linked Tasks)

## Objetivo

Dar um objetivo extra além da caçada livre, com recompensas maiores, reproduzindo o sistema de "Linked Tasks" do RubinOT — tarefas encadeadas por sala, cada uma desbloqueando a próxima.

## Quem usa

Jogador, na aba Tarefas, a partir do nível mínimo de cada sala.

## O que o usuário precisa conseguir fazer

- Ver as salas de tasks disponíveis, com nível mínimo e a sequência de tarefas de cada uma.
- Iniciar uma tarefa (abater N unidades de uma criatura específica).
- Acompanhar o progresso da tarefa ativa e cancelá-la se quiser.
- Receber a recompensa automaticamente ao concluir.

## Regras de negócio

- **As tarefas de uma sala formam uma cadeia sequencial ("Linked").** A tarefa N só fica disponível depois que a tarefa N-1 foi concluída **pelo menos uma vez**.
  *Por quê:* é o mecanismo real de Linked Tasks do RubinOT — força uma progressão guiada pelo bestiário da sala.
- **Apenas uma tarefa pode estar ativa por vez**, em qualquer sala.
- **A primeira conclusão de cada tarefa paga o dobro** (gold, XP e Rubini Coins) em relação às conclusões seguintes, e é sinalizada visualmente como "1ª vez".
  *Por quê:* recompensa quem avança pela primeira vez na cadeia, como no sistema original.
- **Cada sala tem seu próprio nível mínimo de acesso**, crescendo em dificuldade (ex.: sala inicial a partir do nível 8; sala final a partir do nível 250).
- **A última tarefa da sala final é abater os próprios bosses das outras salas** — fechando a progressão das salas de tasks numa tarefa culminante.

## Comportamento esperado

- Cancelar uma tarefa ativa zera o progresso dela; o jogador pode iniciá-la de novo depois.
- Progresso de tarefa só conta mortes da criatura-alvo enquanto a tarefa está ativa.

## Critérios de aceitação

- [ ] Uma tarefa nunca aparece disponível antes que a anterior da mesma sala tenha sido concluída ao menos 1 vez.
- [ ] Nunca há mais de uma tarefa ativa simultaneamente.
- [ ] A recompensa da primeira conclusão é sempre o dobro da recompensa de repetição.
