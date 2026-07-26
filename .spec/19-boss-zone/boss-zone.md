# Boss Zone

## Objetivo
Deixar o jogador desafiar o **boss** de uma zona já desbloqueada, sem os monstros comuns dela, e subir a dificuldade (tier) para mais desafio e recompensa. Alvo de combate focado e ladder de poder.

## Quem usa
Todo jogador que já desbloqueou pelo menos uma zona. A aba **Boss Zone** lista os bosses disponíveis.

## O que o usuário precisa conseguir fazer
- Ver os bosses das zonas desbloqueadas, ordenados por força, e desafiar um diretamente (só ele aparece).
- Subir o tier do boss para versões mais fortes.
- Sair e voltar exatamente para a caçada normal anterior.

## Regras de negócio
- **Só bosses de zonas desbloqueadas** — mesmo gate de progressão da caçada normal, filtrando as que têm boss.
- **Reaproveita o combate da caçada.** Mesmo motor da aba Caça, restringindo o spawn ao boss; mesmas fórmulas, loot e regras.
- **Tiers.** Cada zona tem um tier que o jogador pode subir; tier maior aplica multiplicador que deixa o boss **mais forte** (HP/ataque/dano de magia) e mais recompensador que o mesmo bicho encontrado à toa.
- **Ranking.** O tier máximo derrotado por zona soma para o ranking de Boss Zone nos Highscores (autoritativo do servidor).
- Entrar/sair **não vaza** para a caçada normal: ao sair, restaura a zona e o estado de caça anteriores (mesmo após recarregar).

## Comportamento esperado
- Desafiar um boss inicia a luta só contra ele.
- Sair volta à zona/caçada anterior; boss de zona bloqueada não aparece na lista.

## Nota de fidelidade
- Desafiar um boss diretamente aproxima-se do Bosstiary do Tibia, sem correspondência exata confirmada — registrado em [../90-regras-de-negocio-gerais.md](../90-regras-de-negocio-gerais.md).

## Critérios de aceitação
- [ ] Só aparecem bosses de zonas já desbloqueadas, ordenados por força.
- [ ] Desafiar um boss enfrenta só ele, com o mesmo motor/loot da caçada.
- [ ] Subir o tier deixa o boss mais forte e mais recompensador.
- [ ] O tier máximo por zona alimenta o ranking de Boss Zone.
- [ ] Sair do Boss Zone restaura a caçada normal anterior, inclusive após recarregar.
