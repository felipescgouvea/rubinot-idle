# RTC (Rubinot Custom Client)

## Objetivo

Dar ao jogador controle sobre como o personagem se comporta de forma automática em combate — qual magia ou runa usar pra atacar, quando e como se curar — replicando o RTCaster real do RubinOT (a ferramenta de automação de combate do client customizado).

## Quem usa

Jogador, na aba RTC — a segunda aba do jogo, logo depois da Caçada, porque é a primeira coisa que se configura antes de sair caçando.

## O que o usuário precisa conseguir fazer

- Ver as magias disponíveis para sua vocação, com nome, palavras mágicas, nível mínimo, custo de mana e efeito.
- Escolher **uma** forma de ataque automático: uma magia de ataque OU uma runa de ataque (não as duas ao mesmo tempo) — o RTC usa essa escolha a cada golpe durante a caçada.
- Configurar a cura automática em duas frentes independentes, cada uma com seu próprio gatilho de % de vida:
  - **Cura por magia**: qual magia de cura castar e abaixo de que % de HP.
  - **Cura por poção**: qual poção do inventário beber e abaixo de que % de HP (normalmente um gatilho mais baixo, de emergência, pra quando a mana já acabou).

## Regras de negócio

- **Toda magia tem palavras mágicas reais de Tibia** (ex.: "exura", "exori", "exevo gran mas vis"), nível mínimo de vocação e custo de mana fiéis à proporção de poder das magias originais.
- **Cada vocação só vê, no RTC, o que faz sentido pra ela jogar:**
  - **Knight** não usa magia de ataque genérica nem runas de ataque (sem investimento em magia, o dano delas seria irrisório) — ataca com a arma equipada, ou com suas próprias magias de combate corpo a corpo (Berserk / Fierce Berserk). Para cura, usa sua própria magia (Wound Cleansing), nunca "Light Healing" (exura) — e depende mais de poção do que o resto do elenco, como o "Knight de poção" clássico do Tibia.
  - **Paladin, Sorcerer e Druid** têm acesso às magias de ataque e cura da própria vocação, e a todas as runas de ataque (Sudden Death, Explosion, Avalanche).
- **Ataque automático é OU magia OU runa, nunca os dois.** Escolher uma runa desliga a magia de ataque automaticamente, e vice-versa — como no client real, onde as duas seções competem pelo mesmo golpe.
- **Runa de ataque consome o item do inventário a cada uso.** Sem estoque da runa escolhida, a caçada volta ao ataque normal (arma equipada ou golpe arcano) até o jogador repor o estoque.
- **Usar uma runa de ataque não treina nenhuma skill de combate** — é um item pronto, não uma habilidade exercitada em tempo real (diferente de atacar com arma ou magia, que treinam a skill correspondente).
- **Cura por magia e cura por poção são independentes e podem disparar na mesma sequência de combate** — a poção existe justamente como rede de segurança para quando a magia não dá conta (sem mana, ou HP caindo rápido demais). Poções nunca são restritas por vocação — qualquer personagem bebe qualquer poção, como no Tibia real.
- **Sem uma magia de cura selecionada, a cura automática usa a cura básica da própria vocação como padrão** ("exura" pra paladin/sorcerer/druid, "exura ico" pra knight).
- **Sem uma poção de cura selecionada, não há cura automática por poção** — só a de magia.
- **Toda magia tem um tempo de recarga (cooldown) fiel ao Tibia atual.** Depois de lançada, a magia não pode ser lançada de novo até o cooldown passar (ex.: Berserk 4s, Fierce Berserk 6s, Groundshaker 8s, os Strikes 2s, Strong Strikes 8s, as Waves 4–8s, Divine Caldera 4s, Hell's Core / Eternal Winter 40s, curas 1s). Enquanto a magia de ataque está em recarga, o personagem faz o **golpe básico** (arma equipada, ou golpe arcano no caso do mago) e volta a lançar a magia assim que ela fica pronta.
  *Por quê:* é o mecanismo central do Tibia — o cooldown limita o dano por segundo das magias e faz o golpe básico importar entre um cast e outro.
- **Além do cooldown individual, toda magia de ATAQUE compartilha uma recarga de grupo de 2 segundos** — depois de lançar qualquer magia de ataque, nenhuma outra magia de ataque (a mesma ou outra, quando há mais de uma configurada por prioridade) pode ser lançada antes de 2s se passarem, mesmo que o cooldown individual dela já tenha terminado. Cura não entra nessa recarga de grupo (grupo separado).
  *Por quê:* fiel ao Tibia real — sem essa trava, configurar várias magias de ataque por prioridade (ex.: uma de 4s e uma de 6s de recarga) deixa o RTC alternar entre elas mais rápido que qualquer uma sozinha permitiria.

## Comportamento esperado

- Uma magia deixa de estar disponível (e é removida do autocast) se o personagem cair abaixo do nível exigido por ela — o que só pode ocorrer por migração de save antigo, nunca por perda de nível em jogo normal.
- Trocar de vocação, outfit ou qualquer outra coisa não afeta a configuração do RTC — ela é exclusivamente sobre ataque e cura automáticos.

## Critérios de aceitação

- [ ] Nenhuma magia é usável abaixo do seu nível mínimo.
- [ ] Selecionar uma runa de ataque remove a magia de ataque selecionada (e vice-versa).
- [ ] A cura por magia e a cura por poção respeitam, cada uma, seu próprio limiar de % de HP configurado pelo jogador.
- [ ] Ficar sem a runa/poção configurada no inventário não trava o combate — a caçada continua com o comportamento padrão até haver estoque de novo.
- [ ] Knight nunca vê nem consegue selecionar "Light Healing" (exura) ou runas de ataque no RTC.
- [ ] Cada magia respeita seu cooldown fiel ao Tibia: não é lançada de novo antes do tempo de recarga, e nesse meio-tempo o personagem faz o golpe básico.
- [ ] Duas magias de ataque (a mesma ou diferentes) nunca são lançadas com menos de 2s de diferença entre si, mesmo com várias configuradas por prioridade.
