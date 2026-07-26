# Caça e Combate

## Objetivo
O loop central do jogo: o personagem enfrenta as criaturas de uma zona automaticamente, ganha XP, gold e loot, gasta suprimentos e evolui. É a primeira aba e onde o jogador passa mais tempo.

## Quem usa
Todo jogador. A aba **Caça** é a primeira e principal.

## O que o usuário precisa conseguir fazer
- Escolher uma zona e iniciar/pausar a caçada.
- Escolher manualmente qual criatura atacar (Battle List) ou deixar a prioridade do RTC decidir.
- Ajustar o **estilo de luta** e a **densidade** da sala.
- Acompanhar o **Hunt Analyzer** e o log de combate.

## Regras de negócio

### Combate resolvido no servidor
- Dano, cura, morte das criaturas e loot são calculados **no servidor** (fonte de verdade). O cliente exibe um espelho fiel — nunca inventa resultado. Impede trapaça e mantém consistência entre abrir/fechar o jogo.

### Fórmulas fiéis ao Crystal Server
- Ataque de arma, magia, runa, defesa, armadura, resistência elemental e redução seguem as fórmulas reais do Tibia/Crystal Server. O dano tende ao meio da faixa (extremos raros).
- Dano **físico** é reduzido por armadura e defesa de escudo. Dano **elemental** (fogo, energia, gelo, terra, morte, sagrado) ignora armadura e só é reduzido pela **resistência** do equipamento, com teto (nunca imunidade total). Fraqueza a um elemento faz levar mais dano.
- **Estilo de luta:** Ofensivo = dano máximo, defesa reduzida; Defensivo = dano pela metade, defesa cheia; Equilibrado no meio. Só afeta físico e bloqueio de escudo — magia e dano elemental não mudam.

### A sala (pack) e o alvo
- A caçada é contra uma **sala** de criaturas: o alvo à frente e as que esperam atrás. A **densidade** (Solo, Normal, Pack) define quantas aparecem.
- O jogador pode clicar numa criatura da Battle List; senão vale a **prioridade de alvo** do RTC.
- Ataques de **área** acertam várias criaturas de uma vez, conforme a forma (ver [areas-de-ataque.md](areas-de-ataque.md)).

### Suprimentos e rendimento
- A caçada consome poções de vida/mana, munição do paladino e runas dos magos, conforme o RTC.
- O **Hunt Analyzer** mostra o rendimento da sessão: abates, XP, gold, loot e suprimentos gastos, com o lucro (gold + loot − suprimentos). O custo usa o **preço de compra** (poções, com valor de venda zero, ainda contam como gasto).
- Configurável **venda automática** de loot barato (ver [../04-inventario-e-itens.md](../04-inventario-e-itens.md)).

### Criaturas com valores reais
- HP, ataque, defesa, XP, gold e magias de cada criatura são os **valores reais do Tibia** — não escalam com o nível do jogador. Único multiplicador: tier do **Boss Rush** (ver [../19-boss-zone/](../19-boss-zone/boss-zone.md)). Uma zona fica adequada a uma faixa de nível como no Tibia.

### Morte
- Se o HP zera, o personagem morre: perde a fração de XP da fórmula (amenizada por bênçãos/promoção) e revive com HP parcial. A caçada é interrompida. Ver [../02-personagem-e-vocacoes.md](../02-personagem-e-vocacoes.md).

## Comportamento esperado
- Pausar e retomar não zera a sala nem duplica recompensa.
- Fechar o jogo durante a caçada gera **progresso offline** ao voltar (ver [../06-persistencia-e-offline.md](../06-persistencia-e-offline.md)).
- Ficar sem munição/mana/poção degrada o desempenho (só o golpe básico), mas não trava o jogo.

## Critérios de aceitação
- [ ] O dano/cura/loot vêm do servidor; o cliente nunca decide o resultado do combate.
- [ ] Dano físico reduz por armadura/defesa; elemental reduz só por resistência, com teto.
- [ ] O estilo de luta altera dano físico e bloqueio, sem afetar magia/elemental.
- [ ] A densidade muda o tamanho da sala; ataques de área acertam várias criaturas.
- [ ] O Hunt Analyzer contabiliza abates, XP, gold, loot e suprimentos (incluindo poções).
- [ ] Criaturas usam valores reais do Tibia e não escalam com o nível do jogador.
- [ ] Morrer aplica a penalidade de XP e revive com HP parcial, interrompendo a caçada.
