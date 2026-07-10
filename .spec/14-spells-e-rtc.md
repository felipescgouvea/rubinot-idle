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
- **Ataque automático é OU magia OU runa, nunca os dois.** Escolher uma runa desliga a magia de ataque automaticamente, e vice-versa — como no client real, onde as duas seções competem pelo mesmo golpe.
- **Runa de ataque consome o item do inventário a cada uso.** Sem estoque da runa escolhida, a caçada volta ao ataque normal (arma equipada ou golpe arcano) até o jogador repor o estoque.
- **Usar uma runa de ataque não treina nenhuma skill de combate** — é um item pronto, não uma habilidade exercitada em tempo real (diferente de atacar com arma ou magia, que treinam a skill correspondente).
- **Cura por magia e cura por poção são independentes e podem disparar na mesma sequência de combate** — a poção existe justamente como rede de segurança para quando a magia não dá conta (sem mana, ou HP caindo rápido demais).
- **Sem uma magia de cura selecionada, a cura automática usa "Light Healing" (exura) como padrão.**
- **Sem uma poção de cura selecionada, não há cura automática por poção** — só a de magia.

## Comportamento esperado

- Uma magia deixa de estar disponível (e é removida do autocast) se o personagem cair abaixo do nível exigido por ela — o que só pode ocorrer por migração de save antigo, nunca por perda de nível em jogo normal.
- Trocar de vocação, outfit ou qualquer outra coisa não afeta a configuração do RTC — ela é exclusivamente sobre ataque e cura automáticos.

## Critérios de aceitação

- [ ] Nenhuma magia é usável abaixo do seu nível mínimo.
- [ ] Selecionar uma runa de ataque remove a magia de ataque selecionada (e vice-versa).
- [ ] A cura por magia e a cura por poção respeitam, cada uma, seu próprio limiar de % de HP configurado pelo jogador.
- [ ] Ficar sem a runa/poção configurada no inventário não trava o combate — a caçada continua com o comportamento padrão até haver estoque de novo.
