# Recompensa Diária

## Objetivo
Reproduzir o Daily Reward / Reward Shrine do Tibia: um prêmio por dia de login, com sequência crescente ao longo de um ciclo de 7 dias. Dá um motivo simples para voltar todo dia.

## Quem usa
Todo jogador. A recompensa aparece ao entrar no jogo.

## O que o usuário precisa conseguir fazer
- Ver o prêmio do dia e a sequência atual.
- Resgatar o prêmio uma vez por dia.

## Regras de negócio
- **Ciclo de 7 dias**, com prêmios crescentes (gold, Rubini Coins, Supply Completo e boost de XP).
- **Um resgate por dia.** Depois de resgatar, o próximo só fica disponível no dia seguinte.
- **Sequência (streak).** Logar em dias consecutivos avança na sequência; **perder um dia reseta** a sequência para o começo.
  **Por quê:** premiar a constância é o ponto do daily; a sequência crescente recompensa quem volta todo dia.
- Ao chegar ao fim do ciclo, ele recomeça.

## Comportamento esperado
- Já tendo resgatado hoje, o botão fica indisponível até o dia seguinte.
- Um dia pulado zera a sequência; dois logins no mesmo dia contam como um.

## Critérios de aceitação
- [ ] Há um ciclo de 7 dias com prêmios crescentes.
- [ ] Só é possível resgatar uma vez por dia.
- [ ] Dias consecutivos avançam a sequência; pular um dia reseta.
- [ ] Ao fim do ciclo, ele recomeça.
