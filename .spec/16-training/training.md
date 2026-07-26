# Treino

## Objetivo
Reproduzir o Offline/Exercise Training do Tibia: em vez de caçar, o personagem treina uma skill num dummy, ganhando progresso com o tempo — acelerado com o jogo aberto e continuando (mais devagar) enquanto fechado. Alternativa passiva à caçada.

## Quem usa
Todo jogador. A aba **Treino** mostra o personagem treinando, com o outfit fiel ao que veste.

## O que o usuário precisa conseguir fazer
- Escolher uma skill para treinar e iniciar.
- Ver o personagem no palco, com o outfit atual, e o progresso acumulando.
- Parar o treino a qualquer momento.

## Regras de negócio
- **Um treino único e contínuo.** Uma só sessão: rende **acelerado com o jogo aberto** e **mais devagar enquanto fechado**, sem dois modos separados. Não existe "treino offline" à parte.
- **Skills treináveis.** As de arma (Fist, Club, Sword, Axe, Distance), Shielding e Magic Level.
- **Ritmo modesto e fiel.** Skills de arma/Shielding ganham tentativas por minuto; **Magic Level** sobe pela **mana gasta** (exige uma magia escolhida e é limitado pela regeneração da vocação — por isso um mago treina ML muito mais rápido que um knight, sem número inventado). O treino aberto rende bem mais que o fechado.
- **Teto de acúmulo fechado.** O progresso com o jogo fechado tem teto de horas (o mesmo do progresso offline de caçada).
- **Varinha de treino** (prêmio de Arena/Battle Pass) dobra o rendimento enquanto ativa — multiplica o modo em uso, não substitui.
- O crédito é calculado pelo servidor a partir do tempo decorrido, para render igual a quem fica com a aba aberta e a quem fecha.

## Comportamento esperado
- O outfit no palco é o mesmo que o personagem veste.
- Voltar após ficar fora credita o treino acumulado até o teto.
- Trocar de vocação reinicia o treino de Magic Level quando necessário (a skill de dano da vocação muda).

## Critérios de aceitação
- [ ] Há um único treino contínuo: acelerado com o jogo aberto, mais lento (com teto de horas) enquanto fechado.
- [ ] É possível treinar qualquer skill de arma, Shielding ou Magic Level.
- [ ] Magic Level rende pela mana gasta (exige magia escolhida) e depende da regeneração da vocação.
- [ ] A varinha de treino dobra o rendimento enquanto ativa.
- [ ] O crédito é calculado pelo servidor pelo tempo decorrido; o outfit exibido é o real do personagem.
