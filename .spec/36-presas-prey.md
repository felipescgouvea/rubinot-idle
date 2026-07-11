# Presas (Prey)

## Objetivo

Dar ao jogador uma forma de escolher em qual criatura ele quer se especializar por um período, ganhando um bônus (dano, XP ou loot) contra ela — incentivando focar caçadas em alvos específicos e trazendo uma decisão recorrente de "onde vale a pena caçar agora".

**Nota de fidelidade:** inspirado no **Prey System** do Tibia, em que o jogador seleciona uma criatura por slot e recebe um bônus temporário contra ela. Não é uma réplica 1:1 (o real tem Prey Wildcards, listas rotativas e bônus adicionais); segue o mesmo tratamento das demais mecânicas adaptadas — ver Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

## Quem usa

Jogador, na aba "Bestiário" (seção Presas), junto do Bestiário e dos Charms.

## O que o usuário precisa conseguir fazer

- Escolher, em cada um dos 3 slots, uma criatura que ele já enfrentou.
- Ver o bônus concedido (tipo e intensidade em estrelas) e quanto tempo falta pra expirar.
- Rerolar o bônus de um slot pagando gold, sem trocar de criatura.
- Liberar um slot para escolher outra criatura.

## Regras de negócio

- **Só é possível escolher uma criatura já enfrentada** (que tem registro de mortes) — não dá pra "prever" bônus contra algo nunca visto.
- **Cada presa concede um único tipo de bônus** — dano, XP ou loot — sorteado ao travar, com intensidade em estrelas (1★ a 5★, quanto mais estrelas maior o bônus).
- **O bônus só se aplica contra a criatura escolhida**, e apenas enquanto a presa está ativa (2 horas). Loot é chance adicional; dano e XP são acréscimos percentuais.
- **A presa vale durante a caçada, inclusive offline**, enquanto não expira.
- **Rerolar custa gold** e renova o tempo, mantendo a mesma criatura mas sorteando um novo bônus.

## Comportamento esperado

- Sem nenhuma criatura enfrentada, a tela de escolha explica que é preciso caçar primeiro, em vez de mostrar uma lista vazia.
- Uma presa expirada deixa de dar bônus e o slot volta a ficar disponível para nova escolha.

## Critérios de aceitação

- [ ] Só criaturas já enfrentadas aparecem na escolha de presa.
- [ ] O bônus de uma presa ativa só afeta a criatura escolhida.
- [ ] O bônus deixa de valer quando a presa expira.
- [ ] Rerolar consome gold e sorteia um novo bônus mantendo a criatura.
