# Highscores (Ranking Global)

## Objetivo

Dar visibilidade competitiva entre todos os jogadores do Rubinot Idle, incentivando progresso contínuo através de comparação pública.

## Quem usa

Jogador, na aba Highscores. Qualquer jogador pode consultar o ranking; só quem registra um nome participa dele.

## O que o usuário precisa conseguir fazer

- Registrar um nome de personagem único para entrar no ranking.
- Consultar o ranking geral (nível, XP total, mortes, pontos de Arena, tasks concluídas, mundo atual) de todos os jogadores registrados.
- Consultar um ranking separado para CADA skill (Magic Level, Fist/Club/Sword/Axe/Distance Fighting, Shielding) e para o progresso no Bestiário (quantas criaturas distintas já foram mortas ao menos uma vez).
- Ver, em qualquer um desses rankings, quem está em 1º, 2º e 3º lugar destacado com troféu de ouro/prata/bronze.
- Atualizar seu próprio score manualmente, além do envio automático.

## Regras de negócio

- **O nome do personagem deve ter entre 3 e 20 caracteres e ser único entre todos os jogadores.**
- **O progresso é enviado automaticamente ao ranking em intervalos regulares** enquanto o jogador tem um nome registrado — não exige ação manual contínua, e cobre TODAS as categorias (nível, cada skill, bestiário) de uma vez só, não só o placar geral.
- **A leitura do ranking é pública**; não é necessário registrar um nome para consultar os outros jogadores.
- **Cada categoria tem sua própria ordenação** — o ranking geral por nível (empate: XP total); cada skill pelo nível daquela skill especificamente; o Bestiário pela quantidade de criaturas distintas já mortas. Um jogador pode estar em 1º lugar numa skill e fora do top 10 em outra — são rankings independentes, não uma média.
- **Os 3 primeiros de QUALQUER categoria recebem o mesmo destaque visual** (troféu de ouro/prata/bronze), consistente em todas as abas do ranking.

## Comportamento esperado

- Tentar registrar um nome já usado por outro jogador é rejeitado com uma mensagem clara.
- A própria linha do jogador no ranking é destacada visualmente, em qualquer categoria.
- Trocar de categoria (nível/skill/bestiário) não exige registrar o nome de novo nem perder a posição já calculada nas outras.

## Critérios de aceitação

- [ ] Não é possível registrar um nome duplicado.
- [ ] O ranking reflete o progresso recente de todos os jogadores registrados, não apenas do jogador atual.
- [ ] Consultar o ranking nunca exige que o jogador tenha um nome registrado.
- [ ] Existe uma categoria de ranking pra cada uma das 7 skills e uma pro Bestiário, além do ranking geral por nível.
- [ ] O 1º, 2º e 3º lugar de toda categoria mostram troféu de ouro, prata e bronze respectivamente.
