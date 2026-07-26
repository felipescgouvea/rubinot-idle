# Battle Pass

## Objetivo
Dar uma progressão sazonal paralela à do personagem: acumular XP e cumprir missões para subir tiers e resgatar recompensas, com uma trilha gratuita e uma premium. Cria um motivo recorrente para voltar a cada temporada.

## Quem usa
Todo jogador. A aba **Battle Pass** mostra a temporada atual, os tiers e as missões.

## O que o usuário precisa conseguir fazer
- Ver o tier atual, o progresso para o próximo e as recompensas de cada tier (gratuita e premium).
- Cumprir missões diárias e semanais para ganhar XP de Battle Pass.
- Resgatar as recompensas dos tiers alcançados.
- Comprar a trilha premium com Rubini Coins.

## Regras de negócio
- **Temporada = mês calendário.** Ao virar o mês, a temporada muda e o progresso reseta (fiel a battle passes sazonais).
- **XP por tier fixa.** A cada faixa de XP acumulada, sobe um tier. A XP vem do trickle passivo de caçar e das missões.
- **Missões diárias e semanais.** Um conjunto fixo de missões por dia e por semana, ligadas ao que o jogador já faz (abates, gold, tarefas, vitórias na Arena) — não busywork inventado. As mesmas missões valem para todos no mesmo dia/semana.
- **Trilha premium.** Comprada com Rubini Coins, libera uma coluna paralela de recompensas melhores. O premium compra **velocidade e volume**, não poder de fogo.
- **Prêmios não-materiais.** As recompensas (gratuitas e premium) são **apenas** boost (XP/loot/gold por tempo), charm points, cartas de presa e varinha de treino — **nunca** gold, Rubini Coins ou equipamento.
  **Por quê:** prêmio material atalharia a economia (o jogador pularia a caçada que deveria financiar o item) e prêmio de equipamento quebraria a progressão de loot. Boost/charm/presa/treino só aceleram o que o jogador já faz.
- O progresso e o resgate (especialmente do lado premium) são refletidos no servidor.

## Comportamento esperado
- Cumprir uma missão credita a XP de Battle Pass e avança os tiers alcançáveis.
- Resgatar um tier entrega a recompensa uma única vez; a virada de temporada zera o progresso.
- Comprar a trilha premium debita Rubini Coins e libera as recompensas premium dos tiers já alcançados.

## Critérios de aceitação
- [ ] A temporada é o mês calendário e reseta na virada.
- [ ] A XP de Battle Pass vem da caçada e das missões, e cada faixa fixa de XP sobe um tier.
- [ ] Há missões diárias e semanais iguais para todos no período, ligadas a ações reais do jogo.
- [ ] As recompensas são exclusivamente não-materiais (boost, charm, carta de presa, varinha de treino).
- [ ] A trilha premium custa Rubini Coins e entrega recompensas melhores, sem dar material.
- [ ] Resgatar nunca duplica; a virada de temporada zera o progresso.
