# Caçada & Combate

## Objetivo

Ser a atividade principal e contínua do jogo: o personagem entra numa zona, luta automaticamente contra as criaturas dela, e ganha XP, gold e loot — sem exigir cliques constantes do jogador (natureza "idle").

## Quem usa

Jogador, na aba Caçada, depois de ter escolhido uma vocação.

## O que o usuário precisa conseguir fazer

- Selecionar uma zona de caça disponível para o nível e o mundo atual do personagem.
- Iniciar e parar a caçada a qualquer momento.
- Acompanhar o combate em tempo real: criatura atual, vida dela, dano trocado, log de eventos.
- Ver o loot recente e os contadores de mortes por criatura.

## Regras de negócio

- **Cada zona pertence a um único mundo e exige um nível mínimo.** O jogador só vê e pode escolher zonas do mundo em que está.
  *Por quê:* mantém a progressão guiada — o jogador é empurrado para zonas mais fortes conforme evolui.
- **A criatura que aparece é sorteada entre as da zona**, sem ordem fixa.
- **Os atributos das criaturas escalam com o nível do personagem** (ficam mais fortes e valem mais XP/gold conforme o jogador evolui), para que uma mesma zona continue relevante por mais tempo.
- **O dano do personagem depende da skill de ataque da sua vocação** (Sword Fighting para Knight, Distance Fighting para Paladin, Magic Level para Sorcerer/Druid) mais o equipamento — nunca de um número fixo.
- **O dano recebido é reduzido pela Defesa**, que combina a skill Shielding com bônus de equipamento.
- **O ataque e a cura automáticos durante a caçada seguem a configuração do RTC** (magia ou runa de ataque, magia e poção de cura) — ver [14-spells-e-rtc.md](14-spells-e-rtc.md).
- **Ao morrer, a caçada para automaticamente** e o personagem retorna com a penalidade descrita em [10-personagem-e-vocacoes.md](10-personagem-e-vocacoes.md).

## Comportamento esperado

- Trocar de zona ou de mundo enquanto caça reinicia o combate atual (a criatura em luta é perdida, uma nova aparece na zona nova).
- O log de combate mantém um histórico rolável das últimas ações; não precisa ser lido em tempo real para o jogo funcionar (suporta o uso "idle").

## Critérios de aceitação

- [ ] O jogador não consegue caçar numa zona cujo nível mínimo ele não atingiu.
- [ ] O jogador não consegue caçar numa zona de outro mundo.
- [ ] O combate prossegue sozinho sem exigir cliques contínuos.
- [ ] Trocar de zona/mundo durante a caçada não trava o jogo nem deixa o combate num estado inconsistente.
