# Inventário e Itens

## Objetivo
Reproduzir o inventário e o equipamento do Tibia: guardar itens na mochila, equipar nos slots clássicos, vender pelo valor real e receber loot — incluindo as Relíquias, raridades exclusivas de boss.

## Quem usa
Todo jogador. O painel do personagem mostra a mochila e os slots de equipamento.

## O que o usuário precisa conseguir fazer
- Ver os itens da mochila e os detalhes de cada um (atributos, valor de venda).
- Equipar/desequipar nos slots e ver os atributos resultantes.
- Vender itens pelo valor real; usar a venda automática de loot barato.

## Regras de negócio
- **Mochila sem limite.** Sem teto de quantidade nem de tipos — num idle, recusar loot com bag cheia seria perda invisível.
- **Slots clássicos do Tibia:** elmo, armadura, calças, botas, anel, arma, escudo e munição. Cada item só entra no slot compatível.
- **Requisito de nível.** Itens com nível mínimo só equipam a partir dele.
- **Fonte de dano pelo equipamento certo.** Só arma/munição/wand contam para o ataque (elmo/armadura/anel não, como no Tibia); armadura e escudo reduzem dano recebido. Ver [10-caca/combate.md](10-caca/combate.md).
- **Itens reais do Tibia, com nome real.** Nome, tipo, atributos e valor de venda (npcvalue) vêm da fonte oficial. Nome exibido sempre em inglês, em qualquer idioma.
- **Relíquias (raridade).** Variação de item que **só cai de boss**, reforçando o atributo principal por uma % conforme a raridade (Uncommon → Legendary). Várias raridades podem cair no mesmo golpe (cada uma vira uma relíquia separada). É **liberdade de design** deste jogo (não existe raridade de item no Tibia; a analogia mais próxima é o Imbuement) — registrada como exceção em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).
- **Venda automática.** Presets de venda de loot barato (por valor) para não entupir a mochila.
- Itens equipados/vendidos nunca duplicam nem somem sem uma ação do jogador que os explique.

## Comportamento esperado
- Equipar um item recalcula os atributos na hora.
- Vender debita o item e credita o gold pelo valor real; a venda automática age sobre o loot conforme o preset.
- Loot de boss pode incluir relíquias além do drop base.

## Critérios de aceitação
- [ ] A mochila não recusa loot por estar "cheia".
- [ ] Cada item só equipa no slot compatível e respeita o nível mínimo.
- [ ] Só arma/munição/wand contribuem para o ataque; armadura/escudo reduzem dano.
- [ ] Itens têm nome/valor reais do Tibia; o nome não muda por idioma.
- [ ] Relíquias caem só de boss e reforçam o atributo principal por raridade.
- [ ] A venda (manual e automática) nunca duplica nem some item sem ação do jogador.
