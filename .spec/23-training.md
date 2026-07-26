# Training (Treino) — Visão

## Objetivo
Permitir evoluir uma habilidade escolhida fora do combate, treinando em bonecos — de forma **contínua**, com o jogo aberto E fechado. Dá uma via de progressão segura e dirigida, sem risco de morte. A visão é aproximar o treino das formas oficiais do Tibia moderno: armas de treino com cargas e o treino por descanso.

> **Modelo unificado (decisão do Felipe):** existe **um único treino**, não dois modos separados. Ele roda **enquanto o jogo está aberto (ritmo acelerado) E continua enquanto está fechado (ritmo de descanso)** — sem o jogador precisar escolher "online" ou "offline". Não há mais um painel de treino offline separado.

## Quem usa
Todo jogador com personagem criado.

## O que a tela exibe
- ✅ **Um** painel de treino (não dois), com o boneco de treino e o **personagem com o outfit fiel ao equipado** batendo nele. Janela ampla/legível.
- ✅ Skill selecionada, estado atual do treino e tentativas acumuladas na sessão.
- ✨ Armas de treino disponíveis e suas cargas restantes.
- ✨ Tipo de boneco em uso e o bônus de eficiência que ele concede.
- ✨ Escolha de treino offline por descanso (magia OU uma skill de arma) e a estimativa de ganho por hora.

## O que o jogador consegue fazer
- ✅ Iniciar **o treino** escolhendo a skill; ele roda acelerado com o jogo aberto e continua (mais devagar) com o jogo fechado, sem escolher modo.
- ✅ Parar o treino e ver as tentativas acumuladas na sessão.
- ✨ Usar uma arma de treino com cargas: enquanto tiver cargas, o ganho de skill é acelerado; as cargas se esgotam com o uso.
- ✨ Escolher um boneco melhor (comprado) que concede um bônus de eficiência ao treino.
- ✨ Ativar o treino offline por descanso escolhendo entre treinar magia ou uma única skill de arma enquanto desconectado.

## Regras de negócio
- ✅ **Treino único, contínuo.** Existe **um só treino** (não "offline" e "online" separados). Uma vez iniciado, ele **não para**: rende no ritmo ACELERADO enquanto o jogo está aberto e continua no ritmo de DESCANSO enquanto está fechado, sem o jogador escolher modo. *Por quê:* decisão do Felipe — simplicidade e progresso ininterrupto.
- ✅ **Treina qualquer skill.** Escolhe-se livremente Fist, Club, Sword, Axe, Distance, Shielding ou Magic Level. *Por quê:* flexibilidade para direcionar a evolução.
- ✅ **Ritmo:** skills físicas/escudo a uma taxa base por minuto; Magic Level à metade. *Por quê:* magia sempre evolui mais devagar.
- ✅ **Aberto rende ~10x o descanso.** Com o jogo aberto o ganho é ~10x o ritmo de descanso (o "online" de antes); fechado, segue no ritmo de descanso (o "offline" de antes). *Por quê:* recompensa por manter o jogo ativo, sem punir o tempo fora.
- ✅ **Descanso (jogo fechado) conta até 8 horas.** Ao voltar, credita o tempo ausente no ritmo de descanso, limitado a 8 horas. *Por quê:* mesmo teto do progresso de caçada offline.
- ✅ **Caçar encerra o treino.** Iniciar uma caçada encerra o treino ativo creditando o ganho — não se caça e treina ao mesmo tempo. *Por quê:* o boneco e a hunt são atividades excludentes.
- ✅ **Treino é gratuito.** Sem custo de ouro/item. *Por quê:* o custo é o tempo.
- ✅ **Exige vocação definida.** *Por quê:* o treino depende das regras da vocação.
- ✨ **Armas de treino com cargas.** Adquiridas na loja, têm um número finito de cargas; enquanto usadas, aceleram o ganho de skill e perdem carga por tempo de treino, até acabarem. *Por quê:* espelha as Exercise Weapons do Tibia moderno, muito fiéis ao jogo.
- ✨ **Bônus de boneco.** Bonecos melhores concedem um multiplicador de eficiência ao treino. *Por quê:* fiel aos training dummies com bônus do Tibia.
- ✨ **Treino offline por descanso.** Ao descansar desconectado, o jogador escolhe treinar magia OU uma skill de arma, ganhando progresso por hora enquanto está fora, dentro do teto de ausência. *Por quê:* reproduz o offline training oficial do Tibia.

## Comportamento esperado
- ✅ Ao voltar com o treino ativo, as tentativas do período ausente (ritmo de descanso, até 8h) são creditadas na hora e o jogador é avisado.
- ✅ Com o jogo aberto, o treino roda visivelmente (o personagem, com o outfit fiel ao equipado, bate no boneco) e as tentativas sobem no ritmo acelerado.
- ✅ Parar o treino mostra o resumo de tentativas ganhas na sessão.
- ✨ Uma arma de treino sem cargas volta ao ritmo normal e avisa que se esgotou.
- ✨ O bônus do boneco é aplicado de forma transparente ao ganho por minuto exibido.

## Critérios de aceitação
- [ ] Existe **um só** treino (não há painel/modo offline separado).
- [ ] O treino permite escolher qualquer skill.
- [ ] O treino, uma vez iniciado, continua com o jogo aberto E fechado (não para sozinho).
- [ ] Magic Level treina mais devagar que skills físicas.
- [ ] Com o jogo aberto o treino rende ~10x o ritmo de descanso.
- [ ] O tempo de descanso (jogo fechado) credita no máximo 8 horas de ausência.
- [ ] Iniciar uma caçada encerra o treino ativo.
- [ ] O personagem no boneco usa o outfit fiel ao equipado.
- [ ] ✨ Armas de treino com cargas aceleram o ganho até se esgotarem.
- [ ] ✨ Bonecos melhores concedem bônus de eficiência ao treino.
- [ ] ✨ O treino offline por descanso deixa escolher entre magia e uma skill de arma.
