# Mundos (Worlds)

## Objetivo
Oferecer "mundos" temáticos ao estilo dos servidores de Tibia, cada um com um bônus fixo de XP/Gold e um tipo de PvP. Dá um sabor de escolha de servidor e um bônus passivo de fundo à caçada.

## Quem usa
Todo jogador. A aba **Mundos** lista os mundos e o mundo ativo.

## O que o usuário precisa conseguir fazer
- Ver os mundos, seus tipos de PvP, bônus e nível mínimo.
- Selecionar um mundo desbloqueado para ativar seu bônus.

## Regras de negócio
- Cada mundo tem um **tipo de PvP** (Open / Optional / Retro), um **nível mínimo** para desbloquear e um **bônus fixo** de XP e/ou Gold aplicado à caçada.
- O mundo inicial fica desbloqueado desde o começo; os demais exigem o nível mínimo.
- Os mundos **não organizam mais as caçadas** — a navegação de hunts é por cidade (ver [../10-caca/zonas-e-cidades.md](../10-caca/zonas-e-cidades.md)). O mundo é só um bônus passivo de fundo.

## Comportamento esperado
- Ativar um mundo aplica seu multiplicador de XP/Gold ao rendimento da caçada.
- Um mundo bloqueado por nível não pode ser selecionado.

## Nota de fidelidade
- "Mundos" com bônus fixo de XP/Gold é uma **liberdade de design** deste jogo idle, sem equivalente literal 1:1 no Tibia (onde mundos são só servidores). Registrado como exceção deliberada em [../90-regras-de-negocio-gerais.md](../90-regras-de-negocio-gerais.md).

## Critérios de aceitação
- [ ] Cada mundo mostra tipo de PvP, nível mínimo e bônus.
- [ ] Só é possível ativar um mundo cujo nível mínimo foi atingido.
- [ ] O bônus do mundo ativo se aplica ao XP/Gold da caçada.
- [ ] A escolha de mundo não afeta quais hunts aparecem (isso é por cidade).
