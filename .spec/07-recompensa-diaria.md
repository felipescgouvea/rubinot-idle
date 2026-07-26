# Recompensa Diária

## Objetivo
Reproduzir o Daily Reward / Reward Shrine do Tibia: um prêmio por dia de login, com sequência crescente num ciclo de 7 dias. Dá um motivo simples para voltar todo dia.

## Quem usa
Todo jogador. A recompensa aparece ao entrar no jogo.

## O que o usuário precisa conseguir fazer
- Ver o prêmio do dia e a sequência atual.
- Resgatar o prêmio uma vez por dia.

## Regras de negócio
- **Ciclo de 7 dias**, com prêmios crescentes (gold, Rubini Coins, Supply Completo e boost de XP).
- **Um resgate por dia.** Depois de resgatar, o próximo só no dia seguinte.
- **Sequência (streak).** Logar em dias consecutivos avança a sequência; **perder um dia reseta** ao começo — premiar a constância é o ponto do daily.
- Ao fim do ciclo, ele recomeça.

## Comportamento esperado
- Já resgatado hoje, o botão fica indisponível até o dia seguinte.
- Um dia pulado zera a sequência; dois logins no mesmo dia contam como um.

## Critérios de aceitação
- [ ] Há um ciclo de 7 dias com prêmios crescentes.
- [ ] Só é possível resgatar uma vez por dia.
- [ ] Dias consecutivos avançam a sequência; pular um dia reseta.
- [ ] Ao fim do ciclo, ele recomeça.
