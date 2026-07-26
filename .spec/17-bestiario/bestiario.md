# Bestiário

## Objetivo
Reproduzir o Bestiary do Tibia: um catálogo de todas as criaturas que o jogador vai preenchendo ao matá-las, ganhando Charm Points ao completar cada criatura. Dá um objetivo de coleção e alimenta os Charms.

## Quem usa
Todo jogador. A aba **Bestiário** lista as criaturas e o progresso de cada uma.

## O que o usuário precisa conseguir fazer
- Consultar todas as criaturas, com atributos, loot e progresso de abates.
- Buscar uma criatura pelo nome.
- Ver quanto falta para o próximo estágio e acompanhar o progresso ao vivo enquanto caça.

## Regras de negócio
- **Três estágios por criatura**, por contagem acumulada de abates (fiel ao Tibia): I, II e III, cada um a uma quantidade de mortes.
- **Charm Points só ao completar a criatura.** Os pontos são pagos **de uma vez** quando o **último estágio (III)** é concluído — cruzar estágios intermediários não paga nada ainda.
  **Por quê:** é a regra do Tibia; recompensa completar a criatura, não matá-la algumas vezes.
- O catálogo mostra os **valores reais do Tibia** de cada criatura (HP, ataque, XP, gold, loot).
- A contagem de abates é autoritativa do servidor; o bestiário só a reflete.
- Os Charm Points ganhos são gastos em **Charms** (ver [charms.md](charms.md)).

## Comportamento esperado
- Com a aba aberta, o progresso de abates atualiza ao vivo a cada morte.
- Completar o estágio III de uma criatura credita a soma cheia dos Charm Points daquela criatura, uma única vez.
- A busca filtra a lista pelo nome real da criatura.

## Critérios de aceitação
- [ ] Cada criatura tem três estágios por contagem de abates.
- [ ] Charm Points são creditados só ao concluir o estágio III, pela soma cheia, uma vez.
- [ ] O catálogo exibe valores reais do Tibia e o progresso reflete a contagem do servidor.
- [ ] A aba aberta mostra o progresso ao vivo; a busca por nome funciona.
