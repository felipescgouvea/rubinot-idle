# Treino Offline

## Objetivo

Permitir que o jogador evolua uma skill escolhida sem estar caçando — inclusive enquanto está fora do jogo — dando uma alternativa de progresso passivo focada em skill (em vez de XP/gold).

**Nota de fidelidade:** inspirado no **Offline Training / Exercise Weapons** do Tibia, em que o personagem treina uma skill nas dummies fora do combate. Adaptação registrada sob a Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

## Quem usa

Jogador, na aba "Skills" (seção Treino Offline, no topo).

## O que o usuário precisa conseguir fazer

- Escolher uma skill para treinar (skills de arma, Shielding ou Magic Level).
- Ver que o treino está ativo e o quanto rende por minuto.
- Encerrar o treino a qualquer momento.

## Regras de negócio

- **Treino e caçada são mutuamente exclusivos** — iniciar um treino pausa a caçada, e iniciar uma caçada encerra o treino. O personagem nunca faz os dois ao mesmo tempo.
- **O treino rende tentativas da skill escolhida com o tempo**, seguindo a mesma curva de skill da caçada (não existe um atalho que "fure" a progressão normal).
- **O progresso acumula offline**, com o mesmo teto de tempo do progresso offline de caçada — voltar depois de horas fora credita o treino até esse limite.
- **Magic Level treina mais devagar** que as skills de arma, refletindo o custo maior de evoluir magia.

## Comportamento esperado

- Sem vocação escolhida, a seção explica que é preciso escolher uma vocação antes de treinar.
- Ao voltar de um período offline com treino ativo, o jogo credita as tentativas acumuladas e informa o ganho.

## Critérios de aceitação

- [ ] Iniciar um treino pausa a caçada; iniciar uma caçada encerra o treino.
- [ ] O treino rende tentativas da skill escolhida ao longo do tempo.
- [ ] O progresso de treino acumula offline até o teto de tempo definido.
- [ ] Magic Level rende menos tentativas por minuto que as skills de arma.
