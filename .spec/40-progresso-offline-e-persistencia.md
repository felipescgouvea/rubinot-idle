# Progresso Offline & Persistência

## Objetivo

Garantir que o jogador nunca perca o personagem por fechar a aba, e que o tempo fora do jogo enquanto caçava não seja tempo perdido — a essência de um jogo "idle".

## Quem usa

Todo jogador, de forma automática — não é uma tela específica, mas um comportamento transversal do jogo inteiro.

## O que o usuário precisa conseguir fazer

- Fechar o jogo a qualquer momento sem perder progresso.
- Voltar depois de um tempo e ver um resumo do que foi ganho enquanto esteve fora, se estava caçando.
- Forçar um salvamento manual e resetar o personagem, se quiser recomeçar.

## Regras de negócio

- **O jogo salva automaticamente em intervalos regulares e a cada ação relevante** (comprar, equipar, completar task, etc.), além de permitir salvar manualmente.
- **O progresso é salvo localmente no navegador do jogador** — não depende de conta ou login (a única exceção é o nome registrado no ranking global).
- **Progresso offline só é calculado se o jogador estava caçando no momento em que saiu.**
- **O rendimento offline é proporcional ao tempo ausente, mas a um ritmo reduzido** em relação à caçada ativa (a criatura correta da zona, em ritmo mais lento), e **limitado a um teto de horas** — tempo fora além do teto não gera progresso adicional.
  *Por quê:* recompensa a natureza idle do jogo sem tornar irrelevante estar ativamente jogando.
- **Resetar o personagem é uma ação destrutiva e exige confirmação explícita** antes de apagar o progresso salvo.

## Comportamento esperado

- Ao carregar o jogo após um período offline elegível, um resumo (criaturas abatidas, XP e gold ganhos, tempo fora) é mostrado antes de qualquer outra interação.
- Dados de um save antigo que referenciam algo removido do jogo (zona, tarefa etc.) são migrados de forma segura, sem quebrar o carregamento.
- **Uma nova regra de progressão nunca tranca retroativamente quem já tinha acesso a um conteúdo antes dela existir.** Ao carregar o save, o jogo reconhece automaticamente o acesso que o jogador já tinha sob a regra antiga e concede o equivalente sob a regra nova, sem exigir nenhuma ação dele.
  *Por quê:* uma regra de progressão nova (ex.: exigir ter derrotado o chefe de uma zona para desbloquear a próxima) deve tornar o jogo mais rico dali pra frente, nunca punir quem já tinha avançado sob as regras de antes.

## Critérios de aceitação

- [ ] Fechar e reabrir o jogo nunca perde progresso salvo.
- [ ] Progresso offline só aparece quando o jogador estava caçando ao sair.
- [ ] O reset de personagem sempre pede confirmação antes de apagar dados.
