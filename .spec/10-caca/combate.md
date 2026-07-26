# Caça e Combate

## Objetivo
O loop central do jogo: o personagem enfrenta as criaturas de uma zona automaticamente, ganha XP, gold e loot, gasta suprimentos e evolui. É o que o jogador vê na primeira aba e onde passa a maior parte do tempo.

## Quem usa
Todo jogador. A aba **Caça** é a primeira e a principal.

## O que o usuário precisa conseguir fazer
- Escolher uma zona e iniciar/pausar a caçada.
- Ver o palco de batalha com o personagem e a "sala" de criaturas, com HP/mana ao vivo.
- Escolher manualmente qual criatura da sala atacar (Battle List) ou deixar a prioridade do RTC decidir.
- Ajustar o **estilo de luta** (Ofensivo / Equilibrado / Defensivo) e a **densidade** da sala (Solo / Normal / Pack).
- Acompanhar o **Hunt Analyzer** (rendimento da sessão) e o log de combate.

## Regras de negócio

### Combate é resolvido no servidor
- O dano, a cura, a morte das criaturas e o loot são calculados **no servidor**, que é a fonte de verdade. O cliente exibe um espelho fiel da sala real e dos eventos (dano, loot, poção bebida).
  **Por quê:** impede trapaça e mantém o combate consistente entre abrir/fechar o jogo. O que o cliente mostra nunca "inventa" resultado.

### Fórmulas fiéis ao Crystal Server
- Ataque de arma, magia, runa, defesa, armadura, resistência elemental e redução de dano seguem as fórmulas reais do Tibia/Crystal Server. O dano tende ao meio da faixa (extremos são raros).
- Dano **físico** é reduzido por armadura e defesa de escudo; dano **elemental** (fogo, energia, gelo, terra, morte, sagrado) ignora armadura e só é reduzido pela **resistência** do equipamento (com teto, nunca imunidade total). Fraqueza a um elemento faz levar mais dano.
- **Estilo de luta:** Ofensivo dá dano máximo e defesa reduzida; Defensivo corta o dano pela metade e dá defesa cheia; Equilibrado no meio. Só afeta o físico e o bloqueio de escudo — magia e dano elemental não mudam com o modo.

### A sala (pack) e o alvo
- A caçada acontece contra uma **sala** de criaturas: o alvo à frente e as que esperam atrás. A **densidade** define quantas aparecem (Solo, Normal ou Pack).
- O jogador pode clicar numa criatura da Battle List para atacá-la; senão vale a **prioridade de alvo** do RTC.
- Ataques de **área** acertam várias criaturas da sala de uma vez, conforme a forma do ataque (ver [areas-de-ataque.md](areas-de-ataque.md)).

### Suprimentos e rendimento
- A caçada consome suprimentos: poções de vida/mana, munição do paladino e runas dos magos, conforme o RTC.
- O **Hunt Analyzer** mostra o rendimento da sessão: abates, XP, gold, loot e **suprimentos gastos**, com o lucro (gold + loot − suprimentos). O custo dos suprimentos usa o **preço de compra** (poções, cujo valor de venda é zero, ainda contam como gasto).
- O jogador pode configurar **venda automática** de loot barato para não entupir a mochila (ver [../04-inventario-e-itens.md](../04-inventario-e-itens.md)).

### Criaturas com valores reais
- HP, ataque, defesa, XP, gold e magias de cada criatura são os **valores reais do Tibia** — não escalam com o nível do jogador. O único multiplicador é o de tier do **Boss Rush** (ver [../19-boss-zone/](../19-boss-zone/boss-zone.md)).
  **Por quê:** fidelidade ao original; uma zona fica adequada a uma faixa de nível como no Tibia, e o jogador avança de zona conforme fica mais forte.

### Morte
- Se o HP zera, o personagem morre: perde a fração de XP da fórmula (amenizada por bênçãos/promoção) e revive com HP parcial. A caçada é interrompida. Ver [../02-personagem-e-vocacoes.md](../02-personagem-e-vocacoes.md).

## Comportamento esperado
- Pausar e retomar a caçada não zera a sala nem duplica recompensa.
- Fechar o jogo durante a caçada gera **progresso offline** ao voltar (ver [../06-persistencia-e-offline.md](../06-persistencia-e-offline.md)).
- Ficar sem munição/mana/poção degrada o desempenho (o personagem passa a dar só o golpe básico), mas não trava o jogo.

## Critérios de aceitação
- [ ] O dano/cura/loot vêm do servidor; o cliente nunca decide o resultado do combate.
- [ ] Dano físico reduz por armadura/defesa; elemental reduz só por resistência, com teto.
- [ ] O estilo de luta altera dano físico e bloqueio, sem afetar magia/elemental.
- [ ] A densidade muda o tamanho da sala; ataques de área acertam várias criaturas.
- [ ] O Hunt Analyzer contabiliza abates, XP, gold, loot e suprimentos (incluindo poções).
- [ ] Criaturas usam valores reais do Tibia e não escalam com o nível do jogador.
- [ ] Morrer aplica a penalidade de XP e revive com HP parcial, interrompendo a caçada.
