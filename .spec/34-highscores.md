# Highscores (Ranking Global)

## Objetivo

Dar visibilidade competitiva entre todos os jogadores do Rubinot Idle, incentivando progresso contínuo através de comparação pública.

## Quem usa

Jogador, na aba Highscores. Qualquer jogador pode consultar o ranking; só quem registra um nome participa dele.

## O que o usuário precisa conseguir fazer

- Registrar um nome de personagem único para entrar no ranking.
- Consultar o ranking global (nível, XP total, mortes, pontos de Arena, tasks concluídas, mundo atual) de todos os jogadores registrados.
- Atualizar seu próprio score manualmente, além do envio automático.

## Regras de negócio

- **O nome do personagem deve ter entre 3 e 20 caracteres e ser único entre todos os jogadores.**
- **O progresso é enviado automaticamente ao ranking em intervalos regulares** enquanto o jogador tem um nome registrado — não exige ação manual contínua.
- **A leitura do ranking é pública**; não é necessário registrar um nome para consultar os outros jogadores.
- **O ranking é ordenado por nível e, em caso de empate, por XP total.**

## Comportamento esperado

- Tentar registrar um nome já usado por outro jogador é rejeitado com uma mensagem clara.
- A própria linha do jogador no ranking é destacada visualmente.

## Critérios de aceitação

- [ ] Não é possível registrar um nome duplicado.
- [ ] O ranking reflete o progresso recente de todos os jogadores registrados, não apenas do jogador atual.
- [ ] Consultar o ranking nunca exige que o jogador tenha um nome registrado.
