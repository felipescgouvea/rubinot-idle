# Prestige Arena

## Objetivo
Oferecer um PvP simulado: o personagem enfrenta outros jogadores (reais ou bots) numa série de rounds, ganha pontos e sobe de divisão. Dá uma competição rápida e um destino diário para o poder de combate.

## Quem usa
Todo jogador. A aba **Arena** mostra o oponente, o log da luta, os pontos e a divisão.

## O que o usuário precisa conseguir fazer
- Iniciar uma batalha (dentro do limite diário) e ver o resultado round a round.
- Acompanhar seus pontos, sua divisão e as vitórias/derrotas.
- Resgatar a recompensa de cada divisão alcançada.

## Regras de negócio
- **Oponente real ou bot.** A batalha busca um jogador real do ranking global perto do seu nível; se não houver ninguém, usa um bot. A Arena **sempre resolve** uma batalha — nunca trava por falta de oponente.
- **Combate fiel ao Crystal Server.** Usa a mesma maquinaria de dano da caçada (ataque de arma real, redução por armadura/defesa, magia elemental do mago). O oponente é um espelho de força equivalente ao nível dele.
- **Melhor de 3.** Quem vence dois rounds ganha a série. Um round sem nocaute é decidido por quem tem maior % de vida — **nunca há empate**, o resultado da série é sempre decisivo.
- **Limite diário.** Há um número máximo de batalhas por dia, que **reseta sozinho** na virada do dia.
  **Por quê:** sem limite, a Arena viraria torneira infinita de recompensa; o limite é o que faz "voltar amanhã" valer a pena.
- **Pontos e divisões.** Vencer soma pontos; perder subtrai (nunca abaixo de zero). A divisão (Bronze → Grandmaster) é derivada dos pontos.
- **Prêmios não-materiais.** Vitória paga em **charm points** (com bônus por sequência de vitórias), e cada divisão dá uma recompensa única (boost, carta de presa, charm ou varinha de treino). A Arena **nunca** dá gold, Rubini Coins nem equipamento.
  **Por quê:** prêmio material atalharia a economia; a Arena só acelera o que o jogador já faz.
- **Recompensa de divisão única.** Só pode ser resgatada a divisão atual ou já ultrapassada, e nunca duas vezes a mesma.
- Charm points e boosts de prêmio são concedidos pelo servidor (autoritativo).

## Comportamento esperado
- Uma falha de rede ao buscar o oponente não consome a tentativa do dia.
- O log mostra cada round e o resultado da série; a divisão se ajusta aos pontos na hora.

## Critérios de aceitação
- [ ] A Arena sempre resolve a batalha, com jogador real ou bot.
- [ ] A série é melhor de 3, sem empates.
- [ ] Há limite diário de batalhas que reseta na virada do dia.
- [ ] Vencer soma pontos e paga charm points; perder subtrai pontos (nunca abaixo de zero).
- [ ] As recompensas (por vitória e por divisão) são exclusivamente não-materiais.
- [ ] A recompensa de uma divisão só é resgatada uma vez, e só se alcançada.
