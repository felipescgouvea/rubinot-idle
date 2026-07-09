# Critérios de Aceitação Globais

Checklist para validar o Rubinot Idle como um todo. Os critérios específicos de cada área estão nos respectivos arquivos; aqui ficam os que atravessam o jogo inteiro.

## Fidelidade a Tibia/RubinOT (as 4 novas regras)

- [ ] Todo monstro do bestiário existe oficialmente no Tibia, **ou** está listado como exceção documentada de conteúdo exclusivo do RubinOT em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md).
- [ ] Toda sprite usada no jogo vem de uma fonte real do Tibia/RubinOT — nenhuma foi desenhada, gerada ou emprestada de outro jogo.
- [ ] Toda mecânica de jogo tem uma mecânica real equivalente citada em Tibia/RubinOT, ou está listada como liberdade de design deliberada.
- [ ] Todo ícone de interface usa arte extraída do Tibia/RubinOT — nenhum emoji genérico permanece como substituto definitivo.
- [ ] As pendências de conformidade conhecidas (bosses exclusivos com sprite emprestada, ícones em emoji, mecânicas sem correspondência confirmada) estão listadas em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) e não crescem silenciosamente a cada nova funcionalidade.

## Progressão do personagem

- [ ] Vocação, uma vez escolhida, é permanente.
- [ ] Nível nunca ultrapassa 100.
- [ ] Morte nunca causa perda de progresso além da penalidade leve definida (5% XP, retorno com 30% HP).
- [ ] Todo conteúdo com requisito de nível (zona, mundo, Arena, sala de tasks) bloqueia corretamente quem não atingiu o requisito.

## Economia

- [ ] Gold e Rubini Coins nunca ficam negativos.
- [ ] Toda compra na loja debita exatamente o preço na moeda correta antes de entregar o item/efeito.
- [ ] Itens equipados/vendidos nunca duplicam nem desaparecem sem uma ação do jogador que os explique.

## Continuidade (idle e persistência)

- [ ] Fechar o jogo em qualquer momento nunca perde progresso salvo.
- [ ] Progresso offline é concedido apenas quando havia caçada ativa ao sair, com teto de horas e ritmo reduzido em relação ao modo ativo.
- [ ] Um save de uma versão anterior do jogo sempre carrega sem quebrar, mesmo referenciando conteúdo removido.

## Competição

- [ ] O ranking global (Highscores) nunca aceita dois jogadores com o mesmo nome.
- [ ] A Arena sempre resolve uma batalha (com jogador real ou bot), nunca trava por falta de oponente.
