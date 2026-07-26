# Loja (Shop)

## Objetivo
Reunir as lojas do jogo — comprar equipamento e suprimentos com gold, boosts com Rubini Coins e pacotes de Rubini Coins com dinheiro real — reproduzindo a lógica de loja do Tibia/RubinOT (inclusive a Store premium).

## Quem usa
Todo jogador. O botão **Store** no cabeçalho abre a loja.

## O que o usuário precisa conseguir fazer
- Comprar armas, armaduras, escudos, munição, wands/rods e itens de equipamento com gold.
- Comprar poções e runas com gold, e usar o **Supply Completo** (repõe HP/mana e suprimentos de uma vez).
- Comprar **boosts** temporários (XP, loot, gold) com Rubini Coins.
- Comprar **pacotes de Rubini Coins** com dinheiro real.

## As quatro lojas
- **Loja Premium (dinheiro real)** — pacotes de Rubini Coins. É a **única** que cobra dinheiro real e fica separada das demais.
- **Rubini Store (Rubini Coins)** — só boosts temporários de XP, loot e gold.
- **Loja de Equipamentos (gold)** — armas (corpo a corpo, distância, mágicas), munição, armaduras, escudos, elmos, calças, botas, anéis.
- **Loja de Artigos Mágicos (gold)** — Supply Completo, poções (vida/mana) e runas.

## Regras de negócio
- **Cada moeda na sua prateleira.** Gold nas lojas de equipamento/artigos; Rubini Coins na Rubini Store; dinheiro real só na Loja Premium. Não se misturam.
- **Toda compra debita o preço exato na moeda certa antes de entregar** o item/efeito; nunca deixa a moeda negativa.
- **Compra de munição em lote** respeita a quantidade escolhida.
- **A Loja Premium ainda não está ligada a um meio de pagamento real** — o botão sinaliza isso; nenhuma cobrança acontece de fato.
- Itens vendidos/comprados são os reais do Tibia, com nome real; boosts são temporários.
- O jogador também pode **vender** itens da mochila pelo valor real (npcvalue) do item.

## Comportamento esperado
- Comprar sem gold/Rubini suficiente não conclui.
- O Supply Completo repõe vida/mana e recarrega os suprimentos configurados.
- Um boost comprado passa a valer imediatamente pelo tempo indicado.

## Critérios de aceitação
- [ ] Há quatro lojas, cada uma na sua moeda, com a Premium (dinheiro real) separada.
- [ ] Comprar debita o preço exato na moeda certa e nunca deixa a moeda negativa.
- [ ] Compra de munição em lote respeita a quantidade.
- [ ] A Loja Premium sinaliza que a compra real ainda não está ativa.
- [ ] Boosts passam a valer na hora, pelo tempo indicado; itens têm nome real do Tibia.
