# Boss Zone

## Objetivo
Deixar o jogador desafiar diretamente o **boss** de uma zona já desbloqueada, sem enfrentar os monstros comuns dela — e subir a dificuldade (tier) do boss para mais desafio e recompensa. Dá um alvo de combate focado e uma ladder de poder.

## Quem usa
Todo jogador que já desbloqueou pelo menos uma zona. A aba **Boss Zone** lista os bosses disponíveis.

## O que o usuário precisa conseguir fazer
- Ver os bosses das zonas que já desbloqueou, ordenados por força.
- Desafiar um boss diretamente (só ele aparece, sem o elenco comum da zona).
- Subir o tier do boss para versões mais fortes.
- Sair do Boss Zone e voltar exatamente para a caçada normal que estava fazendo.

## Regras de negócio
- **Só bosses de zonas desbloqueadas.** A lista é a das zonas já liberadas (mesmo gate de progressão da caçada normal), filtrando as que têm boss definido.
- **Reaproveita o combate da caçada.** Usa o mesmo motor da aba Caça, restringindo o spawn ao boss — as mesmas fórmulas, loot e regras valem.
- **Tiers.** Cada zona tem um tier de boss que o jogador pode subir; um tier maior aplica um multiplicador que deixa o boss **mais forte** (HP/ataque/dano de magia) que o mesmo bicho encontrado à toa — e, portanto, mais recompensador.
- **Ranking.** O tier máximo derrotado em cada zona soma para o ranking de Boss Zone nos Highscores (autoritativo do servidor).
- Entrar/sair do Boss Zone **não vaza** para a caçada normal: ao sair, o jogo restaura a zona e o estado de caça anteriores (mesmo após recarregar a página).

## Comportamento esperado
- Desafiar um boss inicia a luta só contra ele.
- Sair do Boss Zone volta o jogador à zona/caçada que ele tinha antes de entrar.
- Um boss de zona bloqueada não aparece na lista.

## Nota de fidelidade
- Desafiar um boss diretamente aproxima-se do Bosstiary do Tibia, mas a correspondência exata não está confirmada — registrado em [../90-regras-de-negocio-gerais.md](../90-regras-de-negocio-gerais.md).

## Critérios de aceitação
- [ ] Só aparecem bosses de zonas já desbloqueadas, ordenados por força.
- [ ] Desafiar um boss enfrenta só ele, com o mesmo motor/loot da caçada.
- [ ] Subir o tier deixa o boss mais forte e mais recompensador.
- [ ] O tier máximo por zona alimenta o ranking de Boss Zone.
- [ ] Sair do Boss Zone restaura a caçada normal anterior, inclusive após recarregar.
