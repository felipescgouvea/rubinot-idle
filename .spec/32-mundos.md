# Mundos

> **Nota:** desde a introdução das [cidades](16-cidades-e-hunts.md), o mundo deixou de decidir **onde** o jogador caça — a navegação das caçadas passou a ser por cidade. O mundo permanece apenas como um **bônus de fundo** de XP/Gold (uma escolha estratégica passiva), não mais como um filtro de acesso às caçadas.

## Objetivo

Reproduzir o conceito de múltiplos servidores (mundos) de Rubinot, cada um com sua identidade de PvP e seus próprios bônus, dando ao jogador uma escolha estratégica de bônus passivo de XP/Gold.

## Quem usa

Jogador, na aba Mundos, a partir do nível mínimo de cada mundo.

## O que o usuário precisa conseguir fazer

- Ver todos os mundos, seus tipos de PvP, bônus e número de jogadores.
- Viajar para um mundo desbloqueado.

## Regras de negócio

- **Cada mundo tem um tipo de PvP próprio** (Open PvP, Optional PvP, Retro PvP), refletindo os diferentes estilos de servidor que RubinOT oferece.
- **Cada mundo concede um bônus fixo de XP e/ou Gold** às caçadas feitas nele.
- **Um mundo só fica disponível a partir de um nível mínimo do personagem.**
- **Zonas de caça pertencem a um único mundo** — trocar de mundo restringe as zonas visíveis às daquele mundo (ver [11-cacada-e-combate.md](11-cacada-e-combate.md)).
- **Trocar de mundo interrompe a caçada ativa**, já que a criatura em combate pertence à zona do mundo anterior.

## Comportamento esperado

- O jogador é avisado assim que um novo mundo se torna elegível pelo nível.

## Critérios de aceitação

- [ ] Não é possível viajar para um mundo cujo nível mínimo não foi atingido.
- [ ] O bônus de XP/Gold do mundo atual se aplica a toda caçada feita nele.
- [ ] Trocar de mundo nunca deixa o personagem preso numa zona que não existe mais para ele.
