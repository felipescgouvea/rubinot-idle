# Loja (Rubini Store)

## Objetivo

Oferecer uma forma de acelerar ou personalizar a progressão gastando os dois recursos do jogo (gold e Rubini Coins), espelhando a loja real do RubinOT (conhecida como "Ctrl+S").

## Quem usa

Jogador, na aba Shop.

## O que o usuário precisa conseguir fazer

- Ver o próprio saldo de gold e Rubini Coins, e os boosts ativos no momento.
- Comprar boosts temporários, suprimentos, equipamentos ou outfits cosméticos.
- Vestir/retirar um outfit já comprado sem pagar de novo.

## Regras de negócio

- **Boosts são pagos em Rubini Coins; equipamentos e suprimentos são pagos em gold** — a mesma separação de moedas do Rubini Store real.
- **Comprar um boost já ativo soma tempo ao que resta**, em vez de substituí-lo ou desperdiçar o tempo restante.
- **O preço de um equipamento na loja é 4x o valor de venda daquele item** — sempre mais caro comprar pronto do que vender o que se caçou.
- **Rubini Coins só são obtidas jogando** (completando tasks pela primeira vez, vencendo na Arena) — não há compra com dinheiro real implementada.
- **Outfits são cosméticos**: não alteram nenhum atributo de combate, apenas a aparência do personagem.

## Comportamento esperado

- Um outfit já comprado nunca é cobrado de novo — o botão de compra vira um botão de "vestir/tirar".
- Comprar um suprimento restaura HP e mana instantaneamente, sem gastar tempo de jogo.

## Critérios de aceitação

- [ ] Nenhuma compra é concluída sem saldo suficiente na moeda correta.
- [ ] Um boost comprado duas vezes seguidas soma duração, nunca perde o tempo restante.
- [ ] Outfits não alteram atributos de combate.
