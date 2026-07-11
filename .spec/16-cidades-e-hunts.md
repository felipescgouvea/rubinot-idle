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
  - se está **trancada**, o motivo (nível mínimo ainda não atingido, ou boss anterior da cadeia ainda não derrotado).
- A barra de caçada atual mostra a **cidade** e o nome da caçada.

## Regras de negócio

1. **Cada caçada pertence a uma cidade.** Toda hunt tem uma cidade de origem, escolhida pelo tema das criaturas (ex.: dragões em Darashia, gelo em Svargrond, selva em Port Hope).

2. **A cidade é o eixo de navegação; o mundo virou só um bônus de fundo.** Os "mundos" continuam existindo apenas como um bônus passivo de XP/Gold — não decidem mais quais caçadas o jogador pode ver ou acessar.
   - *Por quê:* o jogador pediu que a cidade fosse a forma principal de escolher onde caçar, deixando os mundos como um detalhe secundário.

3. **O acesso a uma caçada depende só de nível e da cadeia de bosses** — não do mundo atual do jogador. Uma caçada abre quando o jogador atinge o nível mínimo dela e, quando ela faz parte de uma cadeia, derrotou o boss da caçada anterior.

4. **Existem caçadas "avulsas", liberadas só pelo nível.** Algumas caçadas novas de cada cidade não fazem parte da cadeia principal de bosses: bastam o nível mínimo para entrar. Servem para dar mais opções sem travar atrás da progressão principal.

5. **Novas criaturas e caçadas foram adicionadas** para enriquecer as cidades (ex.: Yetis e Aranhas de Cristal em Svargrond, a Selva de Tiquanda em Port Hope, os Wyrms em Darashia, a Torre dos Heróis em Edron), com XP, gold e loot coerentes com a força de cada uma.

## Critérios de aceitação

- [ ] Ao abrir o seletor de caçada, aparece primeiro a lista de cidades.
- [ ] Escolher uma cidade mostra as caçadas daquela cidade.
- [ ] Existe um jeito de voltar para a lista de cidades.
- [ ] Cada caçada trancada informa o motivo (nível ou boss).
- [ ] O jogador consegue caçar em cidades diferentes sem precisar "trocar de mundo".
- [ ] A caçada atual exibe a cidade a que pertence.
- [ ] As criaturas novas aparecem com seu visual próprio (não um ícone genérico).
