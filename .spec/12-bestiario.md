# Bestiário

## Objetivo

Fornecer o catálogo de criaturas que dá sentido a caçadas, tarefas e loot — a peça mais visível da fidelidade do jogo a Tibia, já que cada criatura é mostrada com a sprite real do jogo original.

## Quem usa

Todo jogador, indiretamente, sempre que caça ou consulta tarefas.

## O que o usuário precisa conseguir fazer

- Reconhecer visualmente a criatura (sprite real do Tibia) e seu nome ao encontrá-la.
- Entender, ao consultar uma task, quantas mortes daquela criatura são necessárias.

## Regras de negócio

- **Cada criatura tem: HP, ataque, defesa, XP concedida, faixa de gold (mínimo–máximo) e uma tabela de loot**, em que cada item tem sua própria chance de drop, independente dos demais.
- **O dono do jogo pode auditar e ajustar, criatura por criatura e item por item, a chance de drop de cada item do loot normal, diretamente em porcentagem** — sem precisar calcular proporções, e sem afetar as outras criaturas nem os outros itens daquela mesma criatura. Também pode ajustar, diretamente em porcentagem, a chance de cada raridade de Relíquia (drop exclusivo de boss — ver [20-itens-e-equipamento.md](20-itens-e-equipamento.md)). Nenhum ajuste altera o padrão visto pelo jogador até o dono mudar algo; sem ajuste nenhum, vale o valor padrão do jogo.
  *Por quê:* balancear economia/loot é um trabalho contínuo do dono; sem controle direto em %, cada ajuste vira tentativa e erro com proporções relativas difíceis de prever o resultado real.
- **O bestiário é majoritariamente composto por criaturas reais do Tibia** (Cave Rat, Goblin, Dwarf, Elf, Dragon, Demon, Hydra, Medusa, Behemoth, entre outras), cobrindo desde criaturas iniciantes até bosses de altíssimo nível.
- **A caçada acontece em 49 zonas, espalhadas pelos 6 mundos do jogo, cobrindo do nível 1 ao nível 100** — sempre há uma zona nova esperando conforme o personagem sobe de nível.
- **Cinco criaturas são bosses exclusivos do RubinOT** (Lothlorien, Executioner, Morgul, The Corrupted, N'Zoth). Aparecem como recompensa final das Linked Tasks de suas respectivas salas e também numa única zona de caça de altíssimo nível dedicada a eles — não aparecem misturados às zonas comuns do bestiário.
  *Por quê:* essas salas replicam o sistema real de "Linked Tasks" do RubinOT, cujos bosses finais são conteúdo exclusivo do servidor, não do Tibia original.
- **Sprites de criaturas são carregadas diretamente de uma fonte oficial de Tibia (TibiaWiki)** — não são desenhadas ou geradas para o jogo. Se uma sprite não carregar, o jogo cai de volta para um ícone genérico apenas como contingência visual, nunca como substituto definitivo.
- **Cada zona de caça tem uma criatura designada como seu chefe** — normalmente a mais forte já presente no elenco daquela zona. Dentro do mesmo mundo, desbloquear a próxima zona da progressão exige ter derrotado esse chefe ao menos uma vez, além do nível mínimo de sempre.
  *Por quê:* dá um motivo concreto para caçar a zona inteira em vez de só esperar bater o nível mínimo da próxima zona — reforça a progressão guiada, zona a zona, dentro de cada mundo.
- **Todo dia, uma das 49 zonas é sorteada como a Zona Bônus do Dia** — a mesma zona para todos os jogadores, trocando automaticamente à meia-noite. Caçar nela rende +50% de gold e XP extra enquanto durar o dia.
  *Por quê:* replica o Boosted Creature/Boosted Boss real de Tibia, que também muda todo dia e é igual para todos os jogadores do mesmo servidor.
- **As criaturas de cada zona de caça combinam entre si como no Tibia real** — o elenco de cada zona foi revisado contra o habitat/localização real de cada criatura na TibiaWiki, não agrupado por "parece que combina". Exemplos: Dwarf, Orc e Elf dividem a mesma zona (todos ligados a Elvenbane no jogo real); Amazon e Valkyrie (a segunda é literalmente a promoção da primeira); Dragon e Dragon Lord (o próprio bestiário do Dragon Lord diz que dragões normais costumam ser encontrados em sua companhia).
  *Por quê:* encontrar criaturas sem relação nenhuma na mesma zona (ex.: uma criatura de deserto ao lado de uma de laboratório) quebra a promessa de fidelidade — o jogador que conhece Tibia estranha a combinação.
  *Pendência de conformidade identificada:* Scarab e Mutated Human continuam na mesma zona (Deserto dos Scarabs) mesmo sem overlap real confirmado — Scarab é criatura de deserto/tumba (Ankrahmun) e Mutated Human é de laboratório urbano (Yalahar). É a única combinação do bestiário sem uma fonte real de TibiaWiki confirmando o agrupamento; nenhuma outra criatura do elenco atual tinha um encaixe melhor disponível nesse nível.

## Comportamento esperado

- Uma criatura recém-derrotada continua visível na tela (esmaecida/"morta") até a próxima aparecer, para que o jogador veja o resultado do combate mesmo jogando de forma passiva.
- A Zona Bônus do Dia é sinalizada claramente tanto na tela de escolha de zona quanto na barra da zona atual, para o jogador saber sem precisar adivinhar.
- Uma zona com chefe designado nunca tranca retroativamente quem já tinha acesso a ela antes dessa regra existir — ver [40-progresso-offline-e-persistencia.md](40-progresso-offline-e-persistencia.md).

## Critérios de aceitação

- [ ] Toda criatura exibida tem nome, sprite, HP, ataque, defesa, XP e loot definidos.
- [ ] O dono consegue ver e ajustar a % de drop de cada item de cada criatura, e a % de cada raridade de Relíquia, sem precisar calcular proporções — um ajuste num item/raridade nunca muda a % dos demais.
- [ ] Os 5 bosses exclusivos do RubinOT só aparecem através das Linked Tasks correspondentes ou da zona de caça de altíssimo nível dedicada a eles — nunca misturados às zonas comuns.
- [ ] Uma zona com chefe só desbloqueia a próxima zona do mesmo mundo depois que esse chefe foi derrotado ao menos uma vez, além do nível mínimo.
- [ ] A Zona Bônus do Dia é a mesma para todos os jogadores e muda automaticamente a cada novo dia, sempre concedendo +50% de gold/XP enquanto durar.
- [ ] Ver também as regras de fidelidade de bestiário/sprites em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) — inclui uma pendência de conformidade sobre os bosses exclusivos.
