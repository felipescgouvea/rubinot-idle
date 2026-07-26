# Highscores (Ranking Global)

## Objetivo
Reproduzir os Highscores do Tibia: ranking público global comparando todos os jogadores registrados por várias categorias. Objetivo competitivo de longo prazo.

## Quem usa
Todo jogador. A aba **Highscores** mostra os rankings; a posição do próprio jogador é destacada.

## O que o usuário precisa conseguir fazer
- Escolher uma categoria e ver o ranking dos melhores.
- Ver a própria posição e quem está **online** agora.

## Regras de negócio
- **Categorias:** nível do personagem, cada uma das sete skills reais do Tibia (Magic Level, Fist, Club, Sword, Axe, Distance, Shielding), progresso no bestiário e Boss Zone (soma dos tiers máximos derrotados).
- **Comparação global entre registrados**, autoritativa do servidor (não dá para forjar posição no cliente).
- **Nomes únicos** — nunca dois jogadores com o mesmo nome.
- **Indicador de online.** Marca quem está jogando agora; o cabeçalho mostra quantos estão online.

## Comportamento esperado
- Trocar de categoria reordena o ranking por aquele critério.
- A linha do próprio jogador é destacada; jogadores online aparecem marcados.

## Nota de fidelidade
- Ranking global dentro do próprio idle é próximo dos Highscores do Tibia; registrado em [../90-regras-de-negocio-gerais.md](../90-regras-de-negocio-gerais.md) como sistema alinhado ao original.

## Critérios de aceitação
- [ ] Há rankings por nível, pelas sete skills, por bestiário e por Boss Zone.
- [ ] O ranking é global, autoritativo do servidor, e a posição do jogador é destacada.
- [ ] Não há dois jogadores com o mesmo nome.
- [ ] Jogadores online são indicados e a contagem de online aparece no cabeçalho.
