# Loja

## Objetivo

Oferecer uma forma de acelerar ou personalizar a progressão, através de 4 lojas separadas: 3 delas gastam recursos ganhos jogando (gold e Rubini Coins), espelhando a loja real do RubinOT (conhecida como "Ctrl+S"); a quarta vende Rubini Coins com dinheiro real, espelhando a Store oficial de Tibia (que vende Tibia Coins por dinheiro real).

## Quem usa

Jogador, na aba Shop, navegando entre as 4 lojas disponíveis.

## O que o usuário precisa conseguir fazer

- Ver o próprio saldo de gold e Rubini Coins, e os boosts ativos no momento.
- Navegar entre as 4 lojas: Rubini Store (boosts e suprimentos), Loja de Equipamentos (armas e armaduras), Loja de Artigos Mágicos (poções e runas) e Loja Premium (pacotes de Rubini Coins por dinheiro real).
- Comprar boosts temporários, suprimentos, equipamentos ou itens mágicos com gold/Rubini Coins ganhos jogando, ou pacotes de Rubini Coins com dinheiro real na Loja Premium.

A personalização de aparência (outfits) não fica mais na loja — tem uma tela própria de aparência do personagem (ver [10-personagem-e-vocacoes.md](10-personagem-e-vocacoes.md)).

## Regras de negócio

- **Existem 4 lojas separadas**: Rubini Store (boosts pagos em Rubini Coins e suprimentos pagos em gold), Loja de Equipamentos (armas e armaduras, em gold), Loja de Artigos Mágicos (poções e runas, em gold) e Loja Premium (pacotes de Rubini Coins, em dinheiro real).
- **A Loja Premium é a única loja do jogo que cobra dinheiro real (em reais, R$).** As outras 3 lojas usam exclusivamente gold e Rubini Coins conquistados jogando (tasks, Arena) — nunca dinheiro real. A Loja Premium, por sua vez, vende exclusivamente pacotes de Rubini Coins — nunca gold, itens ou qualquer vantagem direta de combate.
  *Por quê:* mantém uma fronteira clara entre "o que se ganha jogando" e "o que se compra com dinheiro real", replicando a separação real entre o Ctrl+S do RubinOT (gasta recursos ganhos jogando) e a Store oficial de Tibia (vende Tibia Coins por dinheiro real).
- **A Loja Premium ainda não está conectada a um meio de pagamento real.** Ao tentar comprar um pacote, o jogo mostra uma mensagem clara avisando que o pagamento ainda não foi integrado — nenhuma cobrança é feita e nenhuma Rubini Coin é concedida no lugar da compra.
  *Por quê:* é mais honesto deixar essa limitação visível ao jogador do que simular uma compra que não aconteceu de verdade ou entregar moeda de graça.
- **Boosts são pagos em Rubini Coins; equipamentos e artigos mágicos são pagos em gold** — a mesma separação de moedas do Rubini Store real.
- **Comprar um boost já ativo soma tempo ao que resta**, em vez de substituí-lo ou desperdiçar o tempo restante.
- **O preço de um equipamento ou item mágico na loja é 4x o valor de venda daquele item** — sempre mais caro comprar pronto do que vender o que se caçou.
- **Rubini Coins são obtidas jogando** (completando tasks pela primeira vez, vencendo na Arena) — a compra com dinheiro real existe como conceito na Loja Premium, mas ainda não está operante (ver acima).

## Comportamento esperado

- Comprar um suprimento restaura HP e mana instantaneamente, sem gastar tempo de jogo.
- Tentar comprar na Loja Premium exibe, de forma clara, que o pagamento real ainda não está disponível — nenhuma cobrança acontece e nenhuma moeda é creditada.

## Critérios de aceitação

- [ ] Nenhuma compra é concluída sem saldo suficiente na moeda correta (gold ou Rubini Coins).
- [ ] Um boost comprado duas vezes seguidas soma duração, nunca perde o tempo restante.
- [ ] A Loja Premium nunca credita Rubini Coins sem um pagamento real de fato processado.
- [ ] Fica claro para o jogador, ao tentar comprar na Loja Premium, que o pagamento ainda não está disponível.
