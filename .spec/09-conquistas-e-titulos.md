# Conquistas e Títulos

## Objetivo
Marcar os feitos do jogador (nível, abates, riqueza, bosses, arena, dedicação) com conquistas, algumas concedendo um **título** exibível ao lado do nome — como no Tibia, onde achievements dão títulos selecionáveis.

## Quem usa
Todo jogador. As conquistas aparecem no painel do personagem.

## O que o usuário precisa conseguir fazer
- Ver quais conquistas desbloqueou e quais faltam.
- Escolher um título disponível para exibir ao lado do nome (ou voltar ao nome puro).

## Regras de negócio
- **Cada conquista é uma condição sobre os stats do personagem** (nível, total de abates, gold total ganho, promoção, bosses derrotados, vitórias de arena, charm points, bênçãos), que são autoritativos do servidor. A conquista é sempre **recalculada** a partir dos stats reais, nunca gravada isolada — para impedir desbloqueio por manipulação do cliente.
- Categorias: progressão de nível, abates, riqueza, bosses de zona, arena, dedicação (promoção, charms, bênçãos).
- Um subconjunto de conquistas concede **títulos** selecionáveis; o jogador exibe um título desbloqueado ou nenhum.
- Ícones/sprites usam arte real do Tibia.

## Comportamento esperado
- Ao atingir a condição, a conquista aparece desbloqueada sem ação extra.
- O título escolhido acompanha o nome onde ele é exibido.

## Critérios de aceitação
- [ ] As conquistas são derivadas dos stats reais (autoritativos do servidor) e recalculadas, não gravadas soltas.
- [ ] Conquistas que concedem título permitem selecionar/limpar o título exibido.
- [ ] Nenhuma conquista pode ser desbloqueada sem satisfazer sua condição real.
