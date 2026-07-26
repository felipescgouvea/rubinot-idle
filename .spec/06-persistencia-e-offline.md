# Persistência e Progresso Offline

## Objetivo
Garantir que o progresso nunca se perca e que o jogo continue rendendo enquanto o jogador está fora — os dois pilares "idle" do produto.

## Quem usa
Todo jogador (indireto): é o que faz o jogo poder ser fechado e retomado sem perda.

## O que o jogador precisa poder confiar
- Fechar o jogo a qualquer momento não perde progresso.
- Ao voltar depois de um tempo fora, ganhar o que a caçada/treino renderam nesse período.
- Um save antigo sempre carrega, mesmo referenciando conteúdo que mudou.

## Regras de negócio
- **Salvamento automático.** O progresso é salvo sozinho (na nuvem e localmente); a nuvem é a fonte de verdade da conta (ver [03-login-e-conta.md](03-login-e-conta.md)).
- **O servidor é a fonte de verdade do progresso real.** Gold, XP e loot são decididos no servidor, que continua **tickando de verdade** mesmo com a aba fechada. O tempo que o jogador ficou fora já foi contado lá.
- **Progresso offline reconciliado, não estimado.** Ao voltar, o jogo **reconcilia** o ganho real do servidor, em vez de estimar no cliente — para nunca contar a mesma janela duas vezes.
- **Concedido só quando havia atividade ao sair,** com **teto de horas** e **ritmo reduzido** em relação ao modo ativo (com o jogo aberto). Vale tanto para a caçada quanto para o treino.
  **Por quê:** o teto e o ritmo reduzido mantêm o idle equilibrado — ficar offline nunca rende mais que jogar ativo.
- **Compatibilidade de save.** Um save de versão anterior sempre carrega sem quebrar, mesmo apontando para conteúdo removido/renomeado (há migração dos formatos antigos).
- **Falha de leitura da nuvem não apaga o save** — protege contra perda por rede.

## Comportamento esperado
- Voltar após horas fora aplica o ganho real acumulado, respeitando o teto.
- Se o servidor não pôde tickar em alguma janela (reinício raro), o jogador simplesmente não ganha por ela — nunca há palpite do cliente para preencher.
- Reiniciar o progresso exige confirmação explícita.

## Critérios de aceitação
- [ ] Fechar o jogo em qualquer momento nunca perde progresso salvo.
- [ ] O progresso offline é o ganho real do servidor, reconciliado ao voltar, sem contar em dobro.
- [ ] O ganho offline só ocorre com atividade ativa ao sair, com teto de horas e ritmo reduzido.
- [ ] Um save de versão anterior sempre carrega, mesmo com conteúdo removido.
- [ ] Uma falha de leitura da nuvem nunca sobrescreve/apaga o save.
