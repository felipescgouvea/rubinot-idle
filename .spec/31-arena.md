# Arena (Prestige Arena)

## Objetivo

Oferecer competição PvP simulada entre jogadores, com progressão própria por divisões — dando sentido a Rubini Coins extras e a um objetivo de fim de jogo para personagens de nível alto.

## Quem usa

Jogador de nível 30 ou mais, na aba Arena.

## O que o usuário precisa conseguir fazer

- Ver sua divisão atual, pontos de prestígio, vitórias, derrotas e quantas batalhas ainda restam no dia.
- Buscar uma batalha contra um oponente.
- Acompanhar o resultado da batalha em um log dedicado.
- Resgatar a recompensa única de primeira vez ao alcançar uma nova divisão.

## Regras de negócio

- **A Arena só é acessível a partir do nível 30.** Abaixo disso, a aba mostra o requisito de forma clara em vez do conteúdo.
- **O sistema busca um oponente real do ranking global primeiro.** Só usa um oponente fictício (bot) quando não há jogador real disponível dentro da faixa de nível compatível.
  *Por quê:* competição contra jogadores reais é mais valiosa que contra bots, mas o jogo não pode travar quando ninguém mais está online.
- **A divisão do jogador é determinada pelos pontos de prestígio acumulados**, numa progressão fixa (Bronze → Prata → Ouro → Platina → Diamante → Mestre → Grão-Mestre).
- **Vencer soma pontos de prestígio e Rubini Coins; perder subtrai pontos**, mas os pontos nunca ficam negativos.
- **A batalha é decidida em melhor-de-2 rounds simulados** com base nos atributos de combate de cada lado.
- **A Arena permite até 15 batalhas por dia**, com o contador reiniciando sozinho à meia-noite.
  *Por quê:* sem um limite diário, a Arena vira uma fonte infinita de Rubini Coins; o limite dá um motivo real para o jogador voltar todo dia, em vez de esgotar tudo de uma vez.
- **Vitórias consecutivas rendem um bônus extra de Rubini Coins, que cresce a cada vitória seguida até um teto.** Perder uma batalha zera a sequência.
  *Por quê:* recompensa manter um streak de vitórias sem virar a fonte principal de Rubini Coins do modo.
- **Alcançar uma divisão pela primeira vez concede uma recompensa única daquela divisão** (gold, Rubini Coins ou item, dependendo da divisão), separada da recompensa normal de cada vitória. Só pode ser resgatada uma vez por divisão, mesmo que o jogador suba e desça de divisão depois.
  *Por quê:* dá um objetivo extra e permanente por divisão, além dos pontos e Rubini Coins ganhos batalha a batalha.

## Comportamento esperado

- Um oponente real do ranking é identificado como tal na tela, para diferenciar de um bot.
- O jogador vê quantas batalhas ainda tem disponíveis no dia, e é avisado com clareza ao esgotar o limite diário.
- Uma recompensa de divisão já resgatada aparece sinalizada como coletada, para não ser confundida com uma ainda disponível.

## Critérios de aceitação

- [ ] A aba Arena está bloqueada e explica o motivo para quem tem menos de nível 30.
- [ ] Pontos de prestígio nunca ficam negativos.
- [ ] O jogo nunca trava por falta de oponente real — sempre cai para um bot como alternativa.
- [ ] O jogador nunca luta mais de 15 vezes na Arena no mesmo dia; o limite reseta sozinho no dia seguinte.
- [ ] O bônus de sequência de vitórias nunca ultrapassa o teto definido, e zera após qualquer derrota.
- [ ] A recompensa de primeira vez de uma divisão nunca é resgatada duas vezes, mesmo que o jogador volte a alcançar aquela divisão depois.
