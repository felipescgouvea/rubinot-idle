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
- **Poções têm nível e vocação mínimos fiéis ao Tibia atual.** Health/Mana Potion não têm restrição; Strong Health/Strong Mana exigem nível 50; Great Health/Great Mana/Great Spirit exigem nível 80; Ultimate Health exige nível 130 — cada uma restrita às vocações do Tibia (ex.: Great Health = Knight/Paladin, Great Mana = Sorcerer/Druid, Great Spirit = Paladin, Ultimate Health = Knight). Quem não cumpre o requisito não consegue usar a poção (nem manualmente, nem pelo auto-uso do RTC); a loja ainda deixa comprar, mas mostra o requisito.
  *Por quê:* o dono pediu que o requisito de poção fosse igual ao Tibia — é o que impede um personagem de baixo nível ou da vocação errada de abusar das poções fortes.

## Comportamento esperado

- Itens chegam ao inventário por loot de criaturas, compra na loja ou recompensa de task/Battle Pass — nunca aparecem sem uma origem rastreável.
- Desequipar um item o devolve ao inventário; não é possível "perder" um item ao desequipá-lo.

## Critérios de aceitação

- [ ] Cada item equipado ocupa exatamente o slot correspondente ao seu tipo.
- [ ] Vender um item remove exatamente 1 unidade e credita o gold correspondente.
- [ ] Vender a pilha inteira remove todas as unidades daquele item e credita o gold total correspondente (valor unitário × quantidade).
- [ ] Não é possível equipar dois itens no mesmo slot simultaneamente.

## Relíquias (itens com modificador de raridade)

### Objetivo

Dar ao loot de boss um motivo extra pra existir além do item base: em vez de sempre o mesmo item fixo, um boss pode deixar cair uma versão reforçada dele, tornando cada abate de boss potencialmente mais valioso que o anterior.

**Nota de fidelidade:** este sistema é uma liberdade de design assumida deliberadamente a pedido do dono do produto — não existe um sistema de "raridade de item" no Tibia oficial nem confirmado no RubinOT. A analogia real mais próxima é o sistema de **Imbuements** do Tibia, que também aplica um bônus de atributo a um item de equipamento já existente. Ver a Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

### Quem usa

Jogador, na aba Inventário (seção "Relíquias", separada da grade de itens comuns) e no card de Equipamento da Caçada.

### O que o usuário precisa conseguir fazer

- Ver todas as relíquias que possui, cada uma com o sprite real do item base, o nome da raridade e o valor do stat já reforçado.
- Equipar ou desequipar uma relíquia no slot correspondente ao tipo do item base.
- Vender uma relíquia individualmente, por um preço maior que o item base equivalente.

### Regras de negócio

- **Relíquias só caem de boss**, nunca de um monstro comum — reforça a ideia de que um boss é sempre um alvo especial de se caçar.
- **Existem 4 raridades**: Normal (padrão, sem bônus — é como todo item cai hoje), Refinado (+10%), Excepcional (+20%) e Lendário (+35%), cada uma mais rara que a anterior.
- **O bônus de raridade se aplica ao stat de combate principal do item** (ataque, defesa, magia, cura ou dano — o que for relevante pra aquele item), arredondado pra cima do valor base do item.
- **Só itens de equipamento (arma, armadura, escudo, elmo, anel, calças, botas) podem virar relíquia** — poções, runas, moedas e materiais nunca têm versão de raridade.
- **Cada relíquia é única**, mesmo que duas tenham o mesmo item base e a mesma raridade — nunca empilham como o inventário comum.
- **Vender uma relíquia paga mais que vender o item base**, proporcional ao tamanho do bônus de raridade — recompensa quem preferir vender uma relíquia que não precisa em vez de guardá-la.
- **Relíquias não são negociáveis no Mercado entre jogadores** (nesta primeira versão) — só podem ser vendidas de volta ao próprio jogo.

### Comportamento esperado

- Vender ou desequipar uma relíquia nunca a duplica nem a perde silenciosamente.
- Vender uma relíquia que está equipada também a remove do slot — o slot não fica "preso" apontando pra algo que não existe mais.

### Critérios de aceitação

- [ ] Nenhuma relíquia cai da morte de um monstro comum — só de boss.
- [ ] O stat reforçado de uma relíquia é sempre maior que o do item base equivalente, na proporção da raridade sorteada.
- [ ] Vender uma relíquia sempre paga mais gold que vender o item base equivalente.
- [ ] Uma relíquia vendida ou desequipada nunca deixa o slot de equipamento "travado".
