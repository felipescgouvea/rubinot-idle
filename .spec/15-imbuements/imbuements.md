# Imbuements

## Objetivo
Reproduzir o sistema de Imbuements do Tibia: aprimorar temporariamente uma peça de equipamento, pagando gold e materiais, para ganhar dano/roubo de vida/mana na arma ou resistência elemental no elmo/armadura. Dá um ralo de gold e materiais e uma camada de otimização de build.

## Quem usa
Todo jogador. A página dedicada de **Imbuements** (estilo do cliente do Tibia) é onde ele escolhe o item e o imbuement.

## O que o usuário precisa conseguir fazer
- Escolher qual item equipável imbuir (arma, elmo ou armadura).
- Ver os imbuements possíveis para aquele tipo de item, com efeito, custo (gold + materiais) e duração.
- Aplicar um imbuement, pagando o custo, e ver o tempo restante.

## Regras de negócio
- **Aprimoramento temporário.** Um imbuement dura um tempo fixo (horas) e **expira** — depois é preciso reaplicar. Enquanto ativo, o efeito é resolvido **no servidor** durante o combate.
- **Por tipo de item, fiel ao Tibia:**
  - **Arma** — efeitos ofensivos: roubo de vida (Vampirism), roubo de mana (Void), dano elemental extra (Scorch, fogo).
  - **Elmo e Armadura** — proteção elemental: reduzem o dano recebido daquele elemento, somando à resistência do equipamento (energia, morte, fogo, gelo, terra).
- **Custo em gold + materiais reais do Tibia.** Cada imbuement pede uma quantia de gold e materiais específicos (poeiras, couros, sedas etc.), todos itens reais.
- **O imbuement mora no item.** Está vinculado à peça equipada; trocar a peça perde o imbuement ativo.
- **Nada inventado.** Nomes, efeitos e materiais são os reais do Tibia; cada imbuement cumpre o propósito do seu nome.

## Comportamento esperado
- A página lista apenas os imbuements compatíveis com o item selecionado.
- Aplicar sem gold/materiais suficientes não conclui.
- Um imbuement expirado deixa de aplicar o efeito no combate.

## Critérios de aceitação
- [ ] É possível imbuir arma, elmo e armadura, cada um com seus imbuements compatíveis.
- [ ] Imbuement de arma dá efeito ofensivo (roubo de vida/mana, dano elemental); de elmo/armadura dá resistência elemental.
- [ ] Aplicar debita gold e os materiais corretos.
- [ ] O imbuement tem duração, expira e é resolvido no servidor durante o combate.
- [ ] Trocar a peça equipada perde o imbuement; nomes/efeitos/materiais são reais do Tibia.
