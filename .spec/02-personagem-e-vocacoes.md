# Personagem e Vocações

## Objetivo
Reproduzir a progressão de personagem do Tibia — escolher vocação, subir de nível por XP, evoluir skills por uso, promover, morrer com penalidade leve. É a espinha dorsal em que caça, tasks e arena se apoiam.

## Quem usa
Todo jogador, desde a criação do personagem.

## O que o usuário precisa conseguir fazer
- Criar personagem e escolher uma das quatro vocações; graduar no nível 8; promover a partir do nível 20.
- Ver atributos (HP, Mana, ataque, defesa, Magic Level), nível, barra de XP, soul points e stamina (quando ligada).
- Comprar bênçãos para amenizar a morte.

## Vocações
Quatro vocações fiéis ao Tibia, cada uma com atributos-base, ganhos por nível e fonte de dano próprios:

- **Knight** — corpo a corpo. Mais HP e defesa; dano escala com Sword/Axe/Club. Quase não evolui Magic Level.
- **Paladin** — à distância. Equilíbrio de HP/mana; dano escala com Distance Fighting; conjura a própria munição.
- **Sorcerer** — mágico ofensivo. Pouco HP, muita mana; dano escala com Magic Level; foco em fogo, energia e morte.
- **Druid** — mágico de gelo/terra e cura. Perfil parecido com o sorcerer; melhores curas e magias de gelo/terra.

Vocação graduada (nível 8) é permanente; antes disso é provisória — porque compromisso de build é identidade do Tibia.

## Nível e experiência
- XP por nível segue a **fórmula oficial do Tibia**. Abates e tarefas dão XP.
- Sem dead-end permanente: sempre há conteúdo ao nível atual, e o número de progresso segue subindo muito além do alcançável — se a XP parasse de virar nível, o ranking saturaria e o jogo perderia o gancho de longo prazo.

## Regeneração de HP/Mana
- HP e Mana regeneram com o tempo, em ritmo por vocação **fiel ao Crystal Server** (mago mais mana; knight mais vida). Lento de propósito — é o número real do Tibia.
- **Promoção dobra a regeneração** ociosa de HP e Mana — principal benefício mecânico da promoção.

## Rook e graduação (nível 8)
- Começa numa fase inicial (Rook/Dawnport) com a vocação da criação como **provisória** e um kit inicial.
- Provisório **treina skills no ritmo neutro** (o mais lento), não no da vocação escolhida — senão dava para farmar Magic Level barato como sorcerer e graduar knight levando o ML de brinde. A vantagem de ritmo só vale após o compromisso.
- **No nível 8 gradua:** confirma ou troca a vocação e recebe o **kit de graduação**. Trocar limpa as magias/runas armadas que a nova vocação não pode lançar.
- Graduação é decidida **pelo servidor** (fonte de verdade do combate); o cliente reflete.

## Promoção (nível 20)
- A partir do nível 20, pagando gold, a vocação vira a versão promovida (Elite Knight / Royal Paladin / Master Sorcerer / Elder Druid).
- Benefício: **regeneração de HP/mana dobrada** e teto de soul points maior. O nome exibido vira o título de elite.

## Morte e penalidade
- Morrer custa uma fração da **XP total** (pode baixar de nível, como no Tibia) e revive com parte do HP máximo. A fração segue a **fórmula real do Crystal Server** (≈10% em níveis baixos, caindo com o nível).
- **Bênçãos** reduzem a perda (cada uma corta um pedaço) e melhoram o HP ao reviver; **promoção** reduz mais. Sem bênção, dói o máximo.
- Penalidade sempre leve, nunca catastrófica — tom idle-friendly.

## Bênçãos (Blessings)
- Até 5, compradas com gold. Preço **escala com o nível** (ralo de gold no fim do jogo).
- **Consumidas ao morrer** — recomprar. Segurar as 5 concede uma conquista.

## Soul Points
- Segunda moeda de conjuração. Teto de 100 (200 se promovido). Só regenera **com o tempo** (mais rápido se promovido); não há ganho por matar.
- Toda magia que fabrica item (munição do paladino, runas dos magos) custa mana **e** soul — impede virar fábrica infinita de runas.

## Stamina (opcional)
- Recurso em minutos, teto de 42h, que **só tem efeito se o operador ligar**.
- Cai caçando, regenera descansando. Abaixo de 14h, a XP cai pela metade — incentiva descanso. Nunca zera a XP.

## Regras de negócio
- Vocação graduada é permanente; nível nunca perde progresso além da penalidade de morte definida.
- Combate, graduação e promoção são resolvidos no servidor; o cliente apenas reflete.

## Critérios de aceitação
- [ ] Há exatamente quatro vocações jogáveis, cada uma com atributos e ritmo de skill próprios.
- [ ] A XP por nível segue a fórmula do Tibia e o nível não trava de forma permanente.
- [ ] Personagem provisório (antes do nível 8) treina no ritmo neutro, não no da vocação escolhida.
- [ ] No nível 8 o jogador pode confirmar ou trocar a vocação e recebe o kit de graduação, com o servidor validando.
- [ ] A partir do nível 20 é possível promover pagando gold, e a regeneração de HP/mana dobra.
- [ ] A morte cobra a fração de XP da fórmula do Crystal Server e revive com HP parcial; bênçãos e promoção reduzem a perda.
- [ ] Bênçãos (até 5) são consumidas ao morrer.
- [ ] Soul points regeneram só com o tempo e limitam a conjuração.
- [ ] Stamina só afeta a XP quando ligada pelo operador.
