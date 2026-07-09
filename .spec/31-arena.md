# Arena (Prestige Arena)

## Objetivo

Oferecer competição PvP simulada entre jogadores, com progressão própria por divisões — dando sentido a Rubini Coins extras e a um objetivo de fim de jogo para personagens de nível alto.

## Quem usa

Jogador de nível 30 ou mais, na aba Arena.

## O que o usuário precisa conseguir fazer

- Ver sua divisão atual, pontos de prestígio, vitórias e derrotas.
- Buscar uma batalha contra um oponente.
- Acompanhar o resultado da batalha em um log dedicado.

## Regras de negócio

- **A Arena só é acessível a partir do nível 30.** Abaixo disso, a aba mostra o requisito de forma clara em vez do conteúdo.
- **O sistema busca um oponente real do ranking global primeiro.** Só usa um oponente fictício (bot) quando não há jogador real disponível dentro da faixa de nível compatível.
  *Por quê:* competição contra jogadores reais é mais valiosa que contra bots, mas o jogo não pode travar quando ninguém mais está online.
- **A divisão do jogador é determinada pelos pontos de prestígio acumulados**, numa progressão fixa (Bronze → Prata → Ouro → Platina → Diamante → Mestre → Grão-Mestre).
- **Vencer soma pontos de prestígio e Rubini Coins; perder subtrai pontos**, mas os pontos nunca ficam negativos.
- **A batalha é decidida em melhor-de-2 rounds simulados** com base nos atributos de combate de cada lado.

## Comportamento esperado

- Um oponente real do ranking é identificado como tal na tela, para diferenciar de um bot.

## Critérios de aceitação

- [ ] A aba Arena está bloqueada e explica o motivo para quem tem menos de nível 30.
- [ ] Pontos de prestígio nunca ficam negativos.
- [ ] O jogo nunca trava por falta de oponente real — sempre cai para um bot como alternativa.
