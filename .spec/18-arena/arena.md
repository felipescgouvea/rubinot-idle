# Prestige Arena

## Objetivo
PvP simulado: o personagem enfrenta outros jogadores (reais ou bots) numa série de rounds, ganha pontos e sobe de divisão. Competição rápida e destino diário para o poder de combate.

## Quem usa
Todo jogador. A aba **Arena** mostra oponente, log da luta, pontos e divisão.

## O que o usuário precisa conseguir fazer
- Iniciar uma batalha (dentro do limite diário) e ver o resultado round a round.
- Acompanhar pontos, divisão e vitórias/derrotas; resgatar a recompensa de cada divisão.

## Regras de negócio
- **Oponente real ou bot.** Busca um jogador real do ranking global perto do nível; sem ninguém, usa bot. A Arena **sempre resolve** — nunca trava por falta de oponente.
- **Combate fiel ao Crystal Server.** Mesma maquinaria de dano da caçada (arma real, redução por armadura/defesa, magia elemental do mago). O oponente é um espelho de força equivalente ao nível dele.
- **Melhor de 3.** Vencer dois rounds ganha a série. Round sem nocaute é decidido por maior % de vida — **nunca há empate**, a série é sempre decisiva.
- **Limite diário** de batalhas, que **reseta na virada do dia** — sem limite, a Arena viraria torneira infinita de recompensa; o limite faz "voltar amanhã" valer a pena.
- **Pontos e divisões.** Vencer soma pontos; perder subtrai (nunca abaixo de zero). A divisão (Bronze → Grandmaster) deriva dos pontos.
- **Prêmios não-materiais.** Vitória paga **charm points** (com bônus por sequência de vitórias); cada divisão dá recompensa única (boost, carta de presa, charm ou varinha de treino). **Nunca** gold, Rubini Coins nem equipamento — prêmio material atalharia a economia; a Arena só acelera o que o jogador já faz.
- **Recompensa de divisão única.** Só a divisão atual ou já ultrapassada, e nunca a mesma duas vezes.
- Charm points e boosts de prêmio são concedidos pelo servidor (autoritativo).

## Comportamento esperado
- Falha de rede ao buscar o oponente não consome a tentativa do dia.
- O log mostra cada round e o resultado da série; a divisão se ajusta aos pontos na hora.

## Critérios de aceitação
- [ ] A Arena sempre resolve a batalha, com jogador real ou bot.
- [ ] A série é melhor de 3, sem empates.
- [ ] Há limite diário de batalhas que reseta na virada do dia.
- [ ] Vencer soma pontos e paga charm points; perder subtrai pontos (nunca abaixo de zero).
- [ ] As recompensas (por vitória e por divisão) são exclusivamente não-materiais.
- [ ] A recompensa de uma divisão só é resgatada uma vez, e só se alcançada.
