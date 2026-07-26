# Especificação Funcional — Rubinot Idle

Este diretório descreve **o que** o Rubinot Idle faz e **por quê**, do ponto de vista de negócio e de uso — não de implementação. Serve para o dono do produto validar se o jogo entrega o que promete, independente da tecnologia por trás.

## Como está organizado

- **Raiz** — fundamentos do jogo e sistemas que **não** são abas da barra lateral (personagem, conta, inventário, configurações, persistência, recompensa diária, presas, conquistas), mais as regras e critérios transversais.
- **Uma pasta por item da barra lateral** (`10-caca/` … `25-admin/`) — cada pasta reúne os arquivos de especificação daquele tópico.
- **Fichas de dados** — `10-caca/monsters/` tem uma ficha por criatura (HP, ataque, XP, loot, zonas) e `12-spells/<vocação>/` uma ficha por magia (palavras, nível, mana, dano/cura, recarga). Geradas a partir dos valores reais do jogo.

## Fundamentos

- [00-objetivo.md](00-objetivo.md) — o que é o Rubinot Idle e por que existe.
- [01-glossario.md](01-glossario.md) — vocabulário do domínio (Tibia/RubinOT + termos do idle).

## Personagem e conta (fora da barra lateral)

- [02-personagem-e-vocacoes.md](02-personagem-e-vocacoes.md) — vocações, atributos, nível, graduação, promoção, morte, bênçãos, soul, stamina.
- [03-login-e-conta.md](03-login-e-conta.md) — login obrigatório, save na nuvem e múltiplos personagens.
- [04-inventario-e-itens.md](04-inventario-e-itens.md) — mochila, slots de equipamento, itens reais e Relíquias.
- [05-configuracoes-e-idioma.md](05-configuracoes-e-idioma.md) — preferências e comportamento de idioma.
- [06-persistencia-e-offline.md](06-persistencia-e-offline.md) — salvamento automático e progresso offline.
- [07-recompensa-diaria.md](07-recompensa-diaria.md) — prêmio diário com sequência de 7 dias.
- [08-presas-prey.md](08-presas-prey.md) — bônus temporário contra uma criatura escolhida.
- [09-conquistas-e-titulos.md](09-conquistas-e-titulos.md) — marcos e títulos exibíveis.

## Barra lateral (uma pasta por item)

- [10-caca/](10-caca/) — **Caça**: [combate](10-caca/combate.md), [zonas e cidades](10-caca/zonas-e-cidades.md), [áreas de ataque](10-caca/areas-de-ataque.md) e [`monsters/`](10-caca/monsters/) (uma ficha por criatura do jogo).
- [11-rtc/](11-rtc/rtc.md) — **RTC**: automação de ataque e cura.
- [12-spells/](12-spells/spells.md) — **Spells**: visão geral + uma ficha por magia, em subpastas por vocação (`knight/`, `paladin/`, `sorcerer/`, `druid/`) e `shared/` (magias de 2+ vocações).
- [13-tasks/](13-tasks/tasks.md) — **Tarefas**: Linked Tasks encadeadas por sala.
- [14-skills/](14-skills/skills.md) — **Skills**: habilidades que sobem por uso.
- [15-imbuements/](15-imbuements/imbuements.md) — **Imbuements**: aprimoramento temporário de equipamento.
- [16-training/](16-training/training.md) — **Treino**: evoluir uma skill fora do combate.
- [17-bestiario/](17-bestiario/) — **Bestiário**: [catálogo](17-bestiario/bestiario.md) e [charms](17-bestiario/charms.md).
- [18-arena/](18-arena/arena.md) — **Arena**: PvP simulado por divisões.
- [19-boss-zone/](19-boss-zone/boss-zone.md) — **Boss Zone**: desafiar bosses direto, por tiers.
- [20-mundos/](20-mundos/mundos.md) — **Mundos**: bônus fixo de XP/Gold por mundo.
- [21-battle-pass/](21-battle-pass/battle-pass.md) — **Battle Pass**: progressão sazonal por tiers.
- [22-shop/](22-shop/shop.md) — **Shop**: as quatro lojas.
- [23-mercado/](23-mercado/mercado.md) — **Mercado**: negociação entre jogadores.
- [24-highscores/](24-highscores/highscores.md) — **Highscores**: ranking global.
- [25-admin/](25-admin/admin.md) — **Admin**: painel do operador.

## Regras transversais

- [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) — regras que atravessam todas as áreas e os princípios de fidelidade a Tibia/RubinOT.
- [99-criterios-de-aceitacao-globais.md](99-criterios-de-aceitacao-globais.md) — checklist final para validar o jogo como um todo.
