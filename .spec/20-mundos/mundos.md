# Mundos (Worlds)

## Objetivo
Oferecer "mundos" temáticos ao estilo dos servidores de Tibia, cada um com bônus fixo de XP/Gold e um tipo de PvP. Sabor de escolha de servidor e bônus passivo de fundo à caçada.

## Quem usa
Todo jogador. A aba **Mundos** lista os mundos e o mundo ativo.

## O que o usuário precisa conseguir fazer
- Ver mundos, tipos de PvP, bônus e nível mínimo.
- Selecionar um mundo desbloqueado para ativar seu bônus.

## Regras de negócio
- Cada mundo tem **tipo de PvP** (Open / Optional / Retro), **nível mínimo** para desbloquear e **bônus fixo** de XP e/ou Gold aplicado à caçada.
- O mundo inicial já vem desbloqueado; os demais exigem o nível mínimo.
- Os mundos **não organizam as caçadas** — a navegação de hunts é por cidade (ver [../10-caca/zonas-e-cidades.md](../10-caca/zonas-e-cidades.md)). O mundo é só bônus passivo de fundo.

## Comportamento esperado
- Ativar um mundo aplica seu multiplicador de XP/Gold ao rendimento da caçada.
- Mundo bloqueado por nível não pode ser selecionado.

## Nota de fidelidade
- "Mundos" com bônus fixo de XP/Gold é **liberdade de design** deste idle, sem equivalente 1:1 no Tibia (onde mundos são só servidores). Exceção deliberada registrada em [../90-regras-de-negocio-gerais.md](../90-regras-de-negocio-gerais.md).

## Critérios de aceitação
- [ ] Cada mundo mostra tipo de PvP, nível mínimo e bônus.
- [ ] Só é possível ativar um mundo cujo nível mínimo foi atingido.
- [ ] O bônus do mundo ativo se aplica ao XP/Gold da caçada.
- [ ] A escolha de mundo não afeta quais hunts aparecem (isso é por cidade).
