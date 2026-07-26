# Mercado entre Jogadores

## Objetivo
Economia real entre jogadores: negociar itens por gold sem depender só de NPCs — reproduzindo o Market do Tibia, com taxa da casa e ofertas que expiram. Dá utilidade a itens excedentes e forma preços de mercado.

## Quem usa
O jogador comum, **quando o Mercado está habilitado** pelo operador (ver [../25-admin/](../25-admin/admin.md)).

## O que o usuário precisa conseguir fazer
- Anunciar um item da mochila por um preço em gold.
- Ver ofertas de outros jogadores e comprar.
- Acompanhar ofertas ativas e receber o gold das vendas (ou o item de volta ao expirar).

## Regras de negócio
- **Taxa da casa.** Uma porcentagem da venda é retida — é um **ralo de gold** que sai da economia, para segurar a inflação típica de idle (fiel à taxa do Market do Tibia). O vendedor recebe o total menos a taxa.
- **Ofertas expiram.** Duram um número fixo de dias; ao expirar sem venda, o item volta ao dono.
- **Habilitação pelo operador.** Só disponível quando o operador liga; desligado, a aba não permite negociar.
- Negociações são validadas no servidor (gold e item conferidos), para não duplicar item nem gold.

## Comportamento esperado
- Anunciar reserva o item (sai da mochila) até vender ou expirar.
- Comprar debita o gold do comprador, entrega o item e credita o vendedor já com a taxa descontada.
- Item de oferta expirada retorna ao dono.

## Critérios de aceitação
- [ ] O Mercado só funciona quando habilitado pelo operador.
- [ ] Toda venda retém a taxa da casa; o vendedor recebe o total menos a taxa.
- [ ] Ofertas expiram após o prazo e devolvem o item ao dono.
- [ ] Nenhuma negociação duplica item ou gold; tudo validado no servidor.
