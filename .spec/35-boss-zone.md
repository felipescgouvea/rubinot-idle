# Boss Zone

## Objetivo

Deixar o jogador desafiar diretamente o boss de uma zona que ele já tem acesso, sem precisar caçar os monstros comuns dela pelo caminho — útil pra quem só quer tentar a sorte do drop de Relíquia daquele boss específico (ver [20-itens-e-equipamento.md](20-itens-e-equipamento.md)) sem repetir a caçada normal inteira.

**Nota de fidelidade:** a analogia real mais próxima em Tibia é o sistema de **Bosstiary**, que permite ao jogador acessar encontros solo contra um boss específico já rastreado, fora do bestiário comum da zona. Não é uma réplica 1:1 (o Bosstiary real tem seu próprio sistema de "Soul Cores" e chances de spawn privado) — fica registrado aqui como mecânica cuja correspondência exata com o real ainda não foi confirmada pelo dono do produto, seguindo o mesmo tratamento dado a Mundos/Battle Pass/Highscores na Regra 3 de [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).

## Quem usa

Jogador, numa aba própria ("Boss Zone"), separada da Caçada normal.

## O que o usuário precisa conseguir fazer

- Ver a lista de todos os bosses cuja zona ele já desbloqueou (mesmo critério de nível/mundo/boss-anterior da Caçada normal).
- Desafiar um boss da lista e acompanhar o combate no mesmo card de batalha usado na Caçada normal.
- Sair do Boss Zone a qualquer momento e retomar a Caçada normal sem que o personagem fique "preso" caçando na zona do boss.

## Regras de negócio

- **A lista de bosses disponíveis é exatamente a lista de zonas já desbloqueadas** do mundo atual — não existe uma lista separada de "bosses liberados"; é a mesma regra de desbloqueio de zona já usada na Caçada.
- **Um desafio de Boss Zone enfrenta só o boss da zona**, nunca os monstros comuns dela — o jogador nunca é interrompido por um monstro aleatório no meio do desafio.
- **Os multiplicadores de gold/XP da zona continuam valendo normalmente** dentro do Boss Zone — não há penalidade nem bônus extra por escolher esse modo.
- **O drop de Relíquia continua valendo normalmente** para qualquer boss derrotado no Boss Zone, com a mesma regra de chance da Caçada normal.
- **Entrar no Boss Zone nunca perde a escolha de zona da Caçada normal** — ao sair do Boss Zone, o jogador volta pra zona (e o estado de caçada) que tinha antes de entrar.

## Comportamento esperado

- Se o jogador não tem nenhum boss desbloqueado ainda (conta nova, ou ainda na 1ª zona), a aba explica isso em vez de mostrar uma lista vazia sem contexto.
- Escolher uma zona pelo seletor normal de Caçada, ou trocar de mundo, sempre encerra um Boss Zone em andamento — o jogador nunca fica sem querer "misturando" os dois modos.

## Critérios de aceitação

- [ ] Todo boss listado no Boss Zone pertence a uma zona que o jogador já tem acesso.
- [ ] Durante um desafio de Boss Zone, nenhum monstro comum da zona aparece — só o boss.
- [ ] Sair do Boss Zone restaura a zona de Caçada normal que estava ativa antes de entrar.
- [ ] Vencer um boss no Boss Zone segue exatamente as mesmas regras de recompensa (XP, gold, loot, Relíquia) de vencê-lo na Caçada normal.
