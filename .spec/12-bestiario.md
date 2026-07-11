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
- **O bestiário é majoritariamente composto por criaturas reais do Tibia** (Cave Rat, Goblin, Dwarf, Elf, Dragon, Demon, Hydra, Medusa, Behemoth, entre outras), cobrindo desde criaturas iniciantes até bosses de altíssimo nível.
- **Cinco criaturas são bosses exclusivos do RubinOT** (Lothlorien, Executioner, Morgul, The Corrupted, N'Zoth) e só aparecem como recompensa final das Linked Tasks de suas respectivas salas — nunca em zonas de caça livre.
  *Por quê:* essas salas replicam o sistema real de "Linked Tasks" do RubinOT, cujos bosses finais são conteúdo exclusivo do servidor, não do Tibia original.
- **Sprites de criaturas são carregadas diretamente de uma fonte oficial de Tibia (TibiaWiki)** — não são desenhadas ou geradas para o jogo. Se uma sprite não carregar, o jogo cai de volta para um ícone genérico apenas como contingência visual, nunca como substituto definitivo.
- **As criaturas de cada zona de caça combinam entre si como no Tibia real** — o elenco de cada zona foi revisado contra o habitat/localização real de cada criatura na TibiaWiki, não agrupado por "parece que combina". Exemplos: Dwarf, Orc e Elf dividem a mesma zona (todos ligados a Elvenbane no jogo real); Amazon e Valkyrie (a segunda é literalmente a promoção da primeira); Dragon e Dragon Lord (o próprio bestiário do Dragon Lord diz que dragões normais costumam ser encontrados em sua companhia).
  *Por quê:* encontrar criaturas sem relação nenhuma na mesma zona (ex.: uma criatura de deserto ao lado de uma de laboratório) quebra a promessa de fidelidade — o jogador que conhece Tibia estranha a combinação.
  *Pendência de conformidade identificada:* Scarab e Mutated Human continuam na mesma zona (Deserto dos Scarabs) mesmo sem overlap real confirmado — Scarab é criatura de deserto/tumba (Ankrahmun) e Mutated Human é de laboratório urbano (Yalahar). É a única combinação do bestiário sem uma fonte real de TibiaWiki confirmando o agrupamento; nenhuma outra criatura do elenco atual tinha um encaixe melhor disponível nesse nível.

## Comportamento esperado

- Uma criatura recém-derrotada continua visível na tela (esmaecida/"morta") até a próxima aparecer, para que o jogador veja o resultado do combate mesmo jogando de forma passiva.

## Critérios de aceitação

- [ ] Toda criatura exibida tem nome, sprite, HP, ataque, defesa, XP e loot definidos.
- [ ] Os 5 bosses exclusivos do RubinOT só aparecem através das Linked Tasks correspondentes.
- [ ] Ver também as regras de fidelidade de bestiário/sprites em [90-regras-de-negocio-gerais.md](90-regras-de-negocio-gerais.md) — inclui uma pendência de conformidade sobre os bosses exclusivos.
