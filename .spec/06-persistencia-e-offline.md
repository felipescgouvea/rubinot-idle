# Persistência e Progresso Offline

## Objetivo
Garantir que o progresso nunca se perca e que o jogo continue rendendo enquanto o jogador está fora — os dois pilares "idle" do produto.

## Quem usa
Todo jogador (indireto): é o que permite fechar e retomar sem perda.

## O que o jogador precisa poder confiar
- Fechar o jogo a qualquer momento não perde progresso.
- Ao voltar, ganhar o que a caçada/treino renderam no período fora.
- Um save antigo sempre carrega, mesmo referenciando conteúdo que mudou.

## Regras de negócio
- **Salvamento automático** na nuvem e localmente; a nuvem é a fonte de verdade da conta (ver [03-login-e-conta.md](03-login-e-conta.md)).
- **O servidor é a fonte de verdade do progresso real.** Gold, XP e loot são decididos no servidor, que continua **tickando** mesmo com a aba fechada. O tempo fora já foi contado lá.
- **Progresso offline reconciliado, não estimado.** Ao voltar, o jogo **reconcilia** o ganho real do servidor em vez de estimar no cliente — para nunca contar a mesma janela duas vezes.
- **Concedido só quando havia atividade ao sair,** com **teto de horas** e **ritmo reduzido** vs. o modo ativo. Vale para caça e treino — o teto e o ritmo mantêm o idle equilibrado (offline nunca rende mais que jogar ativo).
- **Compatibilidade de save.** Save de versão anterior sempre carrega sem quebrar, mesmo apontando para conteúdo removido/renomeado (há migração dos formatos antigos).
- **Falha de leitura da nuvem não apaga o save.**

## Comportamento esperado
- Voltar após horas fora aplica o ganho real acumulado, respeitando o teto.
- Se o servidor não pôde tickar em alguma janela (reinício raro), o jogador não ganha por ela — nunca há palpite do cliente para preencher.
- Reiniciar o progresso exige confirmação explícita.

## Critérios de aceitação
- [ ] Fechar o jogo em qualquer momento nunca perde progresso salvo.
- [ ] O progresso offline é o ganho real do servidor, reconciliado ao voltar, sem contar em dobro.
- [ ] O ganho offline só ocorre com atividade ativa ao sair, com teto de horas e ritmo reduzido.
- [ ] Um save de versão anterior sempre carrega, mesmo com conteúdo removido.
- [ ] Uma falha de leitura da nuvem nunca sobrescreve/apaga o save.
