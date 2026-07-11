# Bestiário e Charms

## Objetivo

Recompensar o jogador por caçar repetidamente cada criatura, transformando a contagem de mortes em progresso permanente: preencher o bestiário rende Charm Points, gastos em bônus passivos de combate (Charms). Dá um objetivo de longo prazo paralelo ao nível.

**Nota de fidelidade:** inspirado no **Bestiary/Charm System** do Tibia. No real, cada charm é atribuído a uma criatura e dispara em combate; aqui o charm é um bônus passivo global, pra caber no modelo idle. Adaptação registrada sob a Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

## Quem usa

Jogador, na aba "Bestiário" (seções Bestiário e Charms).

## O que o usuário precisa conseguir fazer

- Ver, para cada criatura já enfrentada, o progresso de mortes e a etapa atual do bestiário.
- Acumular Charm Points ao cruzar as etapas de mortes de cada criatura.
- Desbloquear charms gastando Charm Points.
- Equipar e desequipar charms (limitado a 3 ao mesmo tempo).

## Regras de negócio

- **Cada criatura tem etapas de mortes acumuladas** (ex.: 10, 50, 250, 1000). Cada etapa alcançada concede Charm Points **uma única vez** — recarregar o jogo nunca paga a mesma etapa de novo.
- **Charm Points são uma moeda única do sistema** — só se ganham preenchendo o bestiário e só se gastam desbloqueando charms.
- **Um charm desbloqueado é permanente**; equipá-lo/desequipá-lo é livre, respeitando o limite de 3 equipados.
- **Charms equipados dão bônus passivos** que valem em toda caçada: dano, XP, gold, chance de loot ou roubo de vida (cura uma fração do dano causado).
- **Os bônus de charm somam com os de Presa e com os boosts** já existentes — nenhum substitui o outro.

## Comportamento esperado

- Sem criaturas enfrentadas, o bestiário explica que é preciso caçar para preenchê-lo.
- Tentar desbloquear um charm sem Charm Points suficientes é bloqueado com aviso claro.
- Tentar equipar um 4º charm é bloqueado com aviso do limite.

## Critérios de aceitação

- [ ] Cruzar uma etapa de bestiário credita Charm Points exatamente uma vez.
- [ ] Charm Points só são gastos ao desbloquear charms.
- [ ] No máximo 3 charms ficam equipados ao mesmo tempo.
- [ ] Os bônus de charms equipados afetam a caçada e somam com Presa/boosts.
