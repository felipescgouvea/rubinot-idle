# Cidades e Caçadas

## Objetivo

Organizar as caçadas por **cidade** de Tibia, dando ao jogador uma navegação familiar e temática: ele escolhe uma cidade e vê as caçadas disponíveis ali. Substitui a navegação anterior, que era por "mundo", tornando a exploração mais próxima do mundo real de Tibia e abrindo espaço para mais opções de caçada.

## Quem usa

O jogador, ao decidir onde caçar.

## O que o usuário precisa conseguir fazer

- Abrir um painel e **escolher uma cidade** entre as cidades de Tibia.
- Ao escolher a cidade, **ver as caçadas (hunts) daquela cidade**, com as criaturas, o nível exigido e se estão liberadas.
- Voltar para a lista de cidades e escolher outra.
- Entrar numa caçada com um clique (escolher a hunt já entra nela).

## Comportamento esperado

- O painel abre **sempre na lista de cidades** — o jogador seleciona a cidade primeiro, depois vê as hunts.
- Cada cidade mostra um resumo: quantas caçadas tem, quantas já estão liberadas e a faixa de nível.
- Dentro da cidade, cada caçada mostra suas criaturas e:
  - se está **liberada**, um botão para caçar ali;
  - se está **trancada**, o motivo (boss anterior da cadeia ainda não derrotado).
- A barra de caçada atual mostra a **cidade** e o nome da caçada.

## Regras de negócio

1. **Cada caçada pertence a uma cidade.** Toda hunt tem uma cidade de origem, escolhida pelo tema das criaturas (ex.: dragões em Darashia, gelo em Svargrond, selva em Port Hope).

2. **A cidade é o eixo de navegação; o mundo virou só um bônus de fundo.** Os "mundos" continuam existindo apenas como um bônus passivo de XP/Gold — não decidem mais quais caçadas o jogador pode ver ou acessar.
   - *Por quê:* o jogador pediu que a cidade fosse a forma principal de escolher onde caçar, deixando os mundos como um detalhe secundário.

3. **Não há restrição de nível para caçar.** O jogador pode entrar em qualquer caçada disponível, mesmo abaixo do nível "sugerido" — as criaturas escalam com o nível dele, então entrar cedo numa zona forte é uma escolha (e um risco) do próprio jogador, não algo bloqueado pelo jogo. O acesso também não depende do mundo atual.
   - *Por quê:* o jogador pediu explicitamente que não houvesse trava de nível nas caçadas.

4. **A única trava é a cadeia de bosses.** Caçadas encadeadas só abrem depois de derrotar o boss da caçada anterior — é a progressão principal. As caçadas "avulsas" (novas) não fazem parte de nenhuma cadeia e ficam sempre disponíveis.

5. **Novas criaturas e caçadas foram adicionadas** para enriquecer as cidades (ex.: Yetis e Aranhas de Cristal em Svargrond, a Selva de Tiquanda em Port Hope, os Wyrms em Darashia, a Torre dos Heróis em Edron), com XP, gold e loot coerentes com a força de cada uma.

## Critérios de aceitação

- [ ] Ao abrir o seletor de caçada, aparece primeiro a lista de cidades.
- [ ] Escolher uma cidade mostra as caçadas daquela cidade.
- [ ] Existe um jeito de voltar para a lista de cidades.
- [ ] Nenhuma caçada é trancada por nível — o jogador pode entrar em qualquer uma (a única trava é o boss da cadeia).
- [ ] O jogador consegue caçar em cidades diferentes sem precisar "trocar de mundo".
- [ ] A caçada atual exibe a cidade a que pertence.
- [ ] As criaturas novas aparecem com seu visual próprio (não um ícone genérico).
