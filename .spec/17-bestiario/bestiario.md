# Bestiário

## Objetivo
Reproduzir o Bestiary do Tibia: catálogo de todas as criaturas, preenchido ao matá-las, que dá Charm Points ao completar cada uma. Objetivo de coleção e fonte dos Charms.

## Quem usa
Todo jogador. A aba **Bestiário** lista as criaturas e o progresso de cada uma.

## O que o usuário precisa conseguir fazer
- Consultar criaturas (atributos, loot, progresso de abates) e buscar por nome.
- Ver quanto falta para o próximo estágio, ao vivo enquanto caça.

## Regras de negócio
- **Três estágios por criatura** (I, II, III), por contagem acumulada de abates — fiel ao Tibia.
- **Charm Points só ao concluir o estágio III**, pagos de uma vez pela soma cheia — porque a regra do Tibia recompensa completar a criatura, não matá-la algumas vezes. Cruzar estágios intermediários não paga.
- O catálogo mostra os **valores reais do Tibia** (HP, ataque, XP, gold, loot).
- A contagem de abates é autoritativa do servidor; o bestiário só reflete.
- Charm Points são gastos em **Charms** (ver [charms.md](charms.md)).

## Comportamento esperado
- Aba aberta: progresso atualiza ao vivo a cada morte.
- Completar o estágio III credita a soma cheia dos Charm Points, uma única vez.
- Busca filtra pelo nome real da criatura.

## Critérios de aceitação
- [ ] Cada criatura tem três estágios por contagem de abates.
- [ ] Charm Points são creditados só ao concluir o estágio III, pela soma cheia, uma vez.
- [ ] O catálogo exibe valores reais do Tibia e o progresso reflete a contagem do servidor.
- [ ] A aba aberta mostra o progresso ao vivo; a busca por nome funciona.
