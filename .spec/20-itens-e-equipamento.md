# Itens & Equipamento

## Objetivo

Dar propósito ao loot: o jogador acumula itens, equipa os melhores e vende o resto, evoluindo seus atributos de combate além do que a skill sozinha oferece.

## Quem usa

Jogador, na aba Inventário, e no card de Equipamento sempre visível na Caçada.

## O que o usuário precisa conseguir fazer

- Ver todos os itens acumulados, com ícone, nome e quantidade.
- Abrir um item para ver seus atributos, equipar, desequipar ou vender.
- Vender uma unidade de cada vez ou, quando há mais de uma unidade do mesmo item, vender a pilha inteira numa única ação.
- Ver o equipamento atual nos slots clássicos do personagem.

## Regras de negócio

- **Os slots de equipamento seguem o layout clássico do Tibia**: elmo, arma, armadura, escudo, anel, calças, botas — organizados no formato de cruz usado no inventário do jogo original.
- **Um item só pode ser equipado no slot correspondente ao seu tipo** (arma no slot de arma, etc.), e cada slot comporta um único item por vez.
- **Itens raros são sinalizados visualmente** diferente dos comuns.
- **Vender um item é definitivo** e paga o valor de venda fixo do item em gold. Quando o jogador tem mais de uma unidade, pode vender tudo de uma vez em vez de repetir a ação item por item, recebendo o valor de venda multiplicado pela quantidade vendida.
- **O card de Equipamento aparece apenas na aba Caçada** — é ali que o jogador acompanha o personagem em combate, então é ali que faz sentido ver o que ele está vestindo.

## Comportamento esperado

- Itens chegam ao inventário por loot de criaturas, compra na loja ou recompensa de task/Battle Pass — nunca aparecem sem uma origem rastreável.
- Desequipar um item o devolve ao inventário; não é possível "perder" um item ao desequipá-lo.

## Critérios de aceitação

- [ ] Cada item equipado ocupa exatamente o slot correspondente ao seu tipo.
- [ ] Vender um item remove exatamente 1 unidade e credita o gold correspondente.
- [ ] Vender a pilha inteira remove todas as unidades daquele item e credita o gold total correspondente (valor unitário × quantidade).
- [ ] Não é possível equipar dois itens no mesmo slot simultaneamente.
