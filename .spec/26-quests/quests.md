# Quests (Raids com Prêmio Real)

## Objetivo
Dar objetivos épicos pontuais, além da caça livre e das Tarefas encadeadas: cada Quest é uma **raid com começo, meio e fim** — uma sequência de inimigos que culmina num chefe — e entrega **um prêmio real e único** ao ser concluída. Reproduz a sensação das grandes quests do Tibia (encarar um desafio fixo por uma recompensa marcante), adaptada ao idle.

## Quem usa
Todo jogador. Começa pelas quests **simples** (sem alavanca/puzzle) — entrar, lutar, vencer o chefe, receber o prêmio.

## O que o usuário precisa conseguir fazer
- Ver a lista de Quests, cada uma com nome, tema, o chefe final e o prêmio.
- Iniciar uma Quest (entra na raid).
- Acompanhar o progresso da raid (quais inimigos faltam até o chefe).
- Receber o prêmio ao derrotar o chefe final — uma vez só.

## Regras de negócio
- **Cada Quest é uma raid com começo/meio/fim.** Uma sequência fixa de inimigos (ondas de criaturas reais do Tibia) terminando num **chefe**. Vencer o chefe = concluir a Quest.
- **Um prêmio real por Quest, não repetível.** O prêmio é **um item real de quest do Tibia** (ex.: recompensa canônica daquela quest). É concedido **uma única vez** por personagem — reabrir a Quest depois de concluída **não** dá o prêmio de novo.
  - **Por quê:** prêmio único preserva o valor do marco e não vira torneira de item (diferente da caça/tarefa repetível).
- **Prêmio pode ser material.** Diferente de Arena/Battle Pass (não-materiais), a Quest pode dar equipamento/itens reais do Tibia — como no Tibia, onde a recompensa da quest é um item. Sempre um item **real** do Tibia (nada inventado).
- **Conclusão é autoritativa do servidor.** Quem decide que o chefe caiu, que a Quest foi concluída e concede o prêmio é o servidor — o cliente só reflete. Impede forjar conclusão/prêmio.
- **Combate da raid segue as mesmas regras da caça.** Dano/vida/loot dos inimigos da raid usam os valores reais do Tibia e as fórmulas do servidor, como qualquer caçada.
- **Sem trava de alavanca nas simples.** As primeiras quests não exigem itens/puzzle — só derrotar a sequência. (Quests mais elaboradas podem vir depois.)

## Comportamento esperado
- **Vencer o chefe ENCERRA a raid** — a raid tem fim de verdade: o chefe **não** reaparece depois de derrotado; a sessão da raid termina sozinha (não vira uma caça infinita do chefe).
- **Ao concluir, o jogo anuncia a conclusão e devolve o jogador à zona em que ele estava antes de entrar na raid** (volta pra caça normal), sem prender a interface na quest.
- Iniciar uma Quest já concluída deixa entrar de novo (rejogar a raid), mas **não** concede o prêmio outra vez — e a mensagem de conclusão da rejogada **não** promete prêmio (deixa claro que já foi concluída).
- Sair/pausar a raid no meio não concede prêmio; o progresso da raid é da sessão (recomeça ao reentrar), a **conclusão** é permanente.
- Morrer na raid interrompe a Quest (mesma penalidade de morte da caça); pode tentar de novo.

## Critérios de aceitação
- [ ] Existe uma lista de Quests, cada uma com chefe final e prêmio real do Tibia visíveis.
- [ ] Iniciar uma Quest entra numa raid (sequência de inimigos → chefe).
- [ ] Derrotar o chefe final concede o prêmio **uma única vez** (segunda vez não repete).
- [ ] Vencer o chefe **encerra a raid**: o chefe não respawna e a sessão termina (não vira caça infinita).
- [ ] Ao concluir, o jogador **volta pra zona anterior** (caça normal) e vê o anúncio de conclusão.
- [ ] A conclusão e o prêmio são validados no servidor; o cliente não consegue forjá-los.
- [ ] O prêmio é sempre um item real do Tibia; nada inventado.
- [ ] Rejogar uma Quest concluída é permitido, mas sem novo prêmio (a mensagem não promete prêmio na rejogada).
