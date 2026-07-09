# Skills

## Objetivo

Reproduzir o sistema de evolução de habilidades do Tibia, em que uma skill sobe **por uso repetido em combate**, não por pontos distribuídos livremente.

## Quem usa

Jogador, na aba Skills, para acompanhar a evolução — a ação em si acontece automaticamente durante a caçada.

## O que o usuário precisa conseguir fazer

- Ver o nível atual de cada skill (Magic Level, Fist/Club/Sword/Axe/Distance Fighting, Shielding).
- Entender qual skill sua vocação treina naturalmente e o progresso até o próximo nível.

## Regras de negócio

- **Skills sobem por uso, não por pontos gastos.** Atacar treina a skill de ataque da vocação; ser atingido treina Shielding; gastar mana treina Magic Level.
  *Por quê:* é assim que funciona em Tibia — a skill reflete a prática, não uma escolha administrativa.
- **Cada vocação treina sua skill de ataque primária de forma mais eficiente** (Knight treina Sword Fighting rápido mas Magic Level devagar; magos é o oposto), assim como no Tibia original.
- **O custo para subir de nível de skill cresce exponencialmente** conforme a skill evolui — fica cada vez mais lento evoluir uma skill já alta.
- **Skills fora da linha da vocação evoluem lentamente ou não evoluem**, já que não são praticadas no combate padrão daquela vocação.

## Comportamento esperado

- Toda evolução de skill gera um evento no log de combate e uma notificação, para o jogador perceber o progresso mesmo sem acompanhar de perto.

## Critérios de aceitação

- [ ] Nenhuma skill sobe sem uma ação de combate correspondente (ataque, defesa ou gasto de mana).
- [ ] A skill de ataque da vocação escolhida evolui visivelmente mais rápido que as demais.
- [ ] O custo de evolução aumenta a cada nível de skill.
