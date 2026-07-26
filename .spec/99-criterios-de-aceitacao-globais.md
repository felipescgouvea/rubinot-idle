# Critérios de Aceitação Globais

Checklist para validar o Rubinot Idle como um todo. Os critérios de cada área estão nos respectivos arquivos; aqui ficam os que atravessam o jogo inteiro.

## Fidelidade a Tibia/RubinOT
- [ ] Todo monstro do bestiário existe oficialmente no Tibia, **ou** está listado como exceção documentada de conteúdo exclusivo do RubinOT em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).
- [ ] Toda sprite de monstro é arte real do **cliente** do Tibia (1:1, sem fallback); nenhuma foi desenhada, gerada ou emprestada de outro jogo.
- [ ] Toda mecânica tem equivalente real citado em Tibia/RubinOT, ou está listada como liberdade de design deliberada.
- [ ] Todo nome exibido de criatura/item/magia é o real do Tibia, igual em qualquer idioma.
- [ ] As fórmulas de combate seguem o Crystal Server; nenhum valor foi aproximado de memória.
- [ ] As pendências de conformidade conhecidas estão listadas em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) e não crescem silenciosamente a cada nova funcionalidade.

## Progressão do personagem
- [ ] Há quatro vocações; a vocação é provisória até a graduação (nível 8) e permanente depois.
- [ ] O nível segue a fórmula do Tibia e não trava de forma permanente.
- [ ] A morte só cobra a penalidade definida (fórmula do Crystal Server, amenizada por bênçãos/promoção) e revive com HP parcial.
- [ ] Todo conteúdo com requisito (zona, mundo, arena, sala de tasks) bloqueia corretamente quem não o cumpriu.

## Economia
- [ ] Gold e Rubini Coins nunca ficam negativos.
- [ ] Toda compra debita exatamente o preço na moeda correta antes de entregar o item/efeito.
- [ ] Itens equipados/vendidos/negociados nunca duplicam nem somem sem uma ação do jogador que os explique.
- [ ] Prêmios de Arena e Battle Pass são exclusivamente não-materiais.

## Combate e servidor
- [ ] Dano, cura, morte de criatura e loot são decididos no servidor; o cliente nunca inventa resultado.
- [ ] Criaturas usam valores reais do Tibia e não escalam com o nível do jogador (exceto o tier do Boss Zone).

## Continuidade (idle e persistência)
- [ ] Fechar o jogo em qualquer momento nunca perde progresso salvo.
- [ ] Progresso offline é o ganho real do servidor, reconciliado ao voltar (sem contar em dobro), só com atividade ativa ao sair, com teto de horas e ritmo reduzido.
- [ ] Um save de versão anterior sempre carrega sem quebrar, mesmo referenciando conteúdo removido.
- [ ] Uma falha de leitura da nuvem nunca apaga o progresso.

## Competição
- [ ] O ranking global (Highscores) nunca aceita dois jogadores com o mesmo nome.
- [ ] A Arena sempre resolve uma batalha (com jogador real ou bot), nunca trava por falta de oponente.
