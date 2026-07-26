# Tarefas (Linked Tasks)

## Objetivo
Dar um objetivo de médio e longo prazo além de caçar sem rumo, reproduzindo as **Linked Tasks** do RubinOT: cadeias de tarefas por sala, cada uma exigindo abater uma quantidade de criaturas e liberando a próxima. Recompensa o avanço com prêmios garantidos.

## Quem usa
Todo jogador, em qualquer nível — a aba de tarefas não tem trava de nível própria, só a trava da cadeia.

## O que o usuário precisa conseguir fazer
- Ver as salas de tarefas e as tarefas de cada uma, com o alvo (criatura), a meta de abates e as recompensas.
- Ativar uma tarefa e acompanhar o progresso de abates enquanto caça.
- Coletar a recompensa ao concluir.

## Regras de negócio
- **Cadeia sequencial (Linked).** Uma tarefa só desbloqueia depois que a anterior da sala foi concluída ao menos uma vez. Uma **sala** só abre depois que **todas** as tarefas da sala anterior foram concluídas ao menos uma vez.
  **Por quê:** é o que faz a progressão do RubinOT — o jogador segue um caminho, não escolhe tarefas soltas.
- **Sem trava de nível.** Qualquer personagem pode entrar em qualquer sala liberada, mesmo que a criatura seja bem mais forte — a única barreira é a cadeia.
- **Uma tarefa ativa por vez.** O jogador escolhe uma tarefa para contar os abates; trocar de tarefa não perde o progresso já registrado.
- **Cada abate conta para a tarefa certa.** Uma tarefa pode aceitar vários tipos de criatura que somam na mesma contagem (ex.: várias espécies de troll).
- **Duas recompensas por tarefa:**
  - **Recompensa de repetição** — entregue a **cada** conclusão (inclusive a primeira).
  - **Recompensa de estreia** — entregue **só na primeira** conclusão, **adicional** à de repetição.
- **Recompensa estática por tarefa.** O valor de cada recompensa é fixo por tarefa e **não escala** com nível ou repetições.
  **Por quê:** decisão de balanceamento — recompensa que escala vira torneira e desestabiliza a economia.
- **Prêmios das tarefas podem ser materiais.** Diferente da Arena/Battle Pass, as tarefas dão XP, gold e itens reais do Tibia (armas de treino, cartas de presa, tokens, moedas de tarefa etc.), sempre itens/valores reais.
- A coleta da recompensa é **autoritativa do servidor** (para não ser forjada no cliente).

## Comportamento esperado
- O progresso de abates é registrado ao vivo enquanto a tarefa está ativa.
- Concluir uma tarefa em um abate múltiplo (área) não conta em dobro nem entrega recompensa duas vezes.
- A recompensa só é concedida uma vez por conclusão, na coleta.

## Critérios de aceitação
- [ ] Uma tarefa só fica disponível após a anterior da sala ser concluída ≥1x; uma sala só abre após a anterior ser 100% concluída.
- [ ] Só há uma tarefa ativa por vez; trocar não perde progresso.
- [ ] A primeira conclusão entrega a recompensa de estreia além da de repetição; as demais entregam só a de repetição.
- [ ] O valor das recompensas é fixo por tarefa e não escala.
- [ ] A coleta é validada no servidor e nunca duplica.
