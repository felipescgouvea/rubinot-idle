# Mercado entre Jogadores

## Objetivo
Criar uma economia real entre jogadores: negociar itens uns com os outros por gold, sem depender só de NPCs — reproduzindo o Market oficial do Tibia, com taxa da casa e ofertas que expiram. Dá utilidade a itens excedentes e forma preços de mercado.

## Quem usa
O jogador comum, **quando o Mercado está habilitado** pelo operador do jogo (ver [../25-admin/](../25-admin/admin.md)).

## O que o usuário precisa conseguir fazer
- Anunciar um item da mochila à venda por um preço em gold.
- Ver ofertas de outros jogadores e comprar.
- Acompanhar suas ofertas ativas e receber o gold das vendas (ou o item de volta quando a oferta expira).

## Regras de negócio
- **Taxa da casa.** Uma porcentagem do valor da venda é retida pela casa — é um **ralo de gold** que sai da economia.
  **Por quê:** segura a inflação típica de jogo idle e é fiel à taxa do Market do Tibia. O vendedor recebe o total menos a taxa.
- **Ofertas expiram.** Uma oferta dura um número fixo de dias; ao expirar sem venda, o item volta para o dono.
- **Habilitação pelo operador.** O Mercado só fica disponível quando o operador liga; desligado, a aba não permite negociar.
- As negociações são validadas no servidor (gold e item conferidos), para não duplicar item nem gold.

## Comportamento esperado
- Anunciar reserva o item (sai da mochila) até vender ou expirar.
- Comprar debita o gold do comprador e entrega o item; credita o vendedor já com a taxa descontada.
- Item de oferta expirada retorna ao dono.

## Critérios de aceitação
- [ ] O Mercado só funciona quando habilitado pelo operador.
- [ ] Toda venda retém a taxa da casa; o vendedor recebe o total menos a taxa.
- [ ] Ofertas expiram após o prazo e devolvem o item ao dono.
- [ ] Nenhuma negociação duplica item ou gold; tudo validado no servidor.
