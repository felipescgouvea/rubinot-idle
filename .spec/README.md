# Especificação Funcional — Rubinot Idle

Este diretório descreve **o que** o Rubinot Idle faz e **por quê**, do ponto de vista de negócio e de uso — não de implementação. Serve para o dono do produto validar se o jogo entrega o que promete, independente da tecnologia usada por trás.

Não é aqui que ficam nomes de função, estrutura de arquivos ou stack técnico — isso vive no código e em documentação técnica.

## Fundamentos

- [00-objetivo.md](00-objetivo.md) — o que é o Rubinot Idle e por que ele existe.
- [01-glossario.md](01-glossario.md) — vocabulário do domínio (Tibia/RubinOT + termos do jogo idle).

## Personagem & Combate

- [10-personagem-e-vocacoes.md](10-personagem-e-vocacoes.md) — criação de personagem, vocações, nível e atributos.
- [11-cacada-e-combate.md](11-cacada-e-combate.md) — zonas de caça e o loop de combate automático.
- [12-bestiario.md](12-bestiario.md) — o catálogo de criaturas e suas regras de loot.
- [13-skills.md](13-skills.md) — evolução de habilidades por uso, ao estilo Tibia.
- [14-spells-e-rtc.md](14-spells-e-rtc.md) — o RTC: ataque automático por magia ou runa, cura automática por magia e por poção.
- [15-areas-de-ataque.md](15-areas-de-ataque.md) — alcance de área de cada ataque: alvo único vs. área (onda, explosão, 3x3), fiel ao Tibia.
- [16-cidades-e-hunts.md](16-cidades-e-hunts.md) — navegação das caçadas por cidade de Tibia; o mundo virou só um bônus de fundo.
- [17-contas-e-login.md](17-contas-e-login.md) — contas por jogador, login obrigatório (e-mail/senha) e progresso salvo na nuvem.

## Itens & Economia

- [20-itens-e-equipamento.md](20-itens-e-equipamento.md) — inventário, slots de equipamento, itens e Relíquias (drop de raridade exclusivo de boss).
- [21-loja.md](21-loja.md) — as 4 lojas do jogo: Rubini Store, Loja de Equipamentos, Loja de Artigos Mágicos e a Loja Premium (dinheiro real).

## Progressão & Competição

- [30-tarefas.md](30-tarefas.md) — Linked Tasks: cadeias de tarefas por sala de bestiário.
- [31-arena.md](31-arena.md) — Prestige Arena e batalhas PvP simuladas.
- [32-mundos.md](32-mundos.md) — os mundos de Rubinot e seus bônus.
- [33-battle-pass.md](33-battle-pass.md) — progressão sazonal por tiers.
- [34-highscores.md](34-highscores.md) — ranking global entre jogadores.
- [35-boss-zone.md](35-boss-zone.md) — desafiar um boss já desbloqueado direto, sem os monstros comuns da zona.
- [36-presas-prey.md](36-presas-prey.md) — Presas: bônus de dano/XP/loot contra uma criatura escolhida por tempo.
- [37-bestiario-e-charms.md](37-bestiario-e-charms.md) — preencher o bestiário rende Charm Points, gastos em bônus passivos (Charms).
- [38-recompensa-diaria.md](38-recompensa-diaria.md) — prêmio de login diário com sequência crescente de 7 dias.
- [39-treino-offline.md](39-treino-offline.md) — treinar uma skill escolhida fora do combate, inclusive offline.

## Persistência

- [40-progresso-offline-e-persistencia.md](40-progresso-offline-e-persistencia.md) — salvamento automático e ganhos enquanto o jogador está fora.

## Interface

- [41-idioma-e-localizacao.md](41-idioma-e-localizacao.md) — idioma padrão inglês, detecção automática pelo navegador e troca manual em Configurações.

## Regras Transversais

- [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) — regras que atravessam todas as áreas, incluindo os **4 princípios de fidelidade a Tibia/RubinOT**.
- [99-criterios-de-aceitacao-globais.md](99-criterios-de-aceitacao-globais.md) — checklist final para validar o jogo como um todo.
