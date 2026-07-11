# Battle Pass

## Objetivo

Dar uma progressão sazonal paralela à evolução normal do personagem, recompensando o tempo de jogo com prêmios fixos e cumulativos por tier.

## Quem usa

Jogador, na aba Battle Pass.

## O que o usuário precisa conseguir fazer

- Ver o tier atual e o progresso até o próximo.
- Ver a trilha de recompensas e resgatar as que já estão disponíveis.
- Ver as 3 missões diárias do dia, acompanhar o progresso de cada uma e resgatar a XP de Battle Pass das que já foram concluídas.

## Regras de negócio

- **A XP do Battle Pass é alimentada automaticamente por uma fração da XP ganha em caçadas e no progresso offline** — o jogador não precisa fazer nada além de jogar normalmente.
- **Além desse ganho passivo, todo jogador recebe 3 missões diárias**, as mesmas para todo mundo no mesmo dia, trocando automaticamente à meia-noite.
  *Por quê:* dá objetivos concretos e variados dentro do próprio Battle Pass, em vez de depender só da passagem do tempo caçando.
- **As missões diárias cobrem ações que o jogador já faz jogando** — matar uma quantidade de criaturas, ganhar uma quantidade de gold caçando, completar Linked Tasks ou vencer lutas na Arena.
- **Cada missão concedida é resgatada manualmente ao ser concluída**, entregando um bloco de XP de Battle Pass — a XP não é creditada automaticamente só por bater a meta.
- **O progresso das 3 missões do dia zera à meia-noite**, junto com o sorteio das novas missões do dia seguinte.
- **Cada tier exige uma quantidade fixa de XP de Battle Pass** para ser alcançado.
- **Cada recompensa só pode ser resgatada uma vez**, mesmo que o jogador ultrapasse aquele tier depois.
- **Recompensas incluem gold, Rubini Coins e itens de equipamento exclusivos da temporada.**

## Comportamento esperado

- Alcançar um novo tier gera uma notificação imediata, mesmo que o jogador não esteja na aba Battle Pass no momento.
- Uma missão diária concluída permanece visível como "pronta para resgatar" até o jogador resgatá-la ou o dia virar.

## Critérios de aceitação

- [ ] Uma recompensa nunca é resgatada duas vezes.
- [ ] O tier do jogador nunca retrocede.
- [ ] Toda XP de caçada (ativa ou offline) contribui para o Battle Pass.
- [ ] As 3 missões diárias são as mesmas para todos os jogadores num dado dia, e trocam automaticamente no dia seguinte.
- [ ] Uma missão diária só concede XP de Battle Pass depois de resgatada, nunca automaticamente ao bater a meta.
