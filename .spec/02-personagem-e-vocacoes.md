# Personagem e Vocações

## Objetivo
Reproduzir a progressão de personagem do Tibia — escolher vocação, subir de nível por XP, evoluir skills por uso, promover, morrer com penalidade leve — de forma reconhecível para quem jogou o original. É a espinha dorsal em que todo o resto (caça, tasks, arena) se apoia.

## Quem usa
Todo jogador, desde a criação do personagem.

## O que o usuário precisa conseguir fazer
- Criar um personagem e escolher uma das quatro vocações.
- Ver seus atributos (HP, Mana, ataque, defesa, Magic Level), nível e barra de XP.
- Graduar no nível 8 (confirmar ou trocar a vocação em definitivo).
- Promover a vocação a partir do nível 20.
- Comprar bênçãos para amenizar a morte.
- Acompanhar soul points e, quando o operador liga, a stamina.

## Vocações
Quatro vocações, fiéis ao Tibia. Cada uma tem atributos-base e ganhos por nível próprios, e uma fonte de dano diferente:

- **Knight** — corpo a corpo. Mais HP e defesa; dano escala com a skill de arma corpo a corpo (Sword/Axe/Club). Quase não evolui Magic Level.
- **Paladin** — à distância. Equilíbrio de HP/mana; dano escala com Distance Fighting; conjura a própria munição.
- **Sorcerer** — mágico ofensivo. Pouco HP, muita mana; dano escala com Magic Level; foco em fogo, energia e morte.
- **Druid** — mágico de gelo/terra e cura. Perfil parecido com o sorcerer; melhores curas e magias de gelo/terra.

**Regra:** a vocação, uma vez graduada (nível 8), é permanente. Antes disso é provisória.
**Por quê:** compromisso de build é parte da identidade do Tibia; permitir troca livre depois esvaziaria a escolha.

## Nível e experiência
- A XP necessária por nível segue a **fórmula oficial do Tibia**. Derrotar criaturas e concluir tarefas dá XP.
- Não há dead-end permanente: sempre há conteúdo acessível ao nível atual, e o número central de progresso continua subindo muito além do que um jogador alcança na prática.
- **Por quê:** um idle não pode "acabar" — se a XP parasse de converter em nível, o ranking saturaria e o jogo perderia o gancho de longo prazo.

## Regeneração de HP/Mana
- HP e Mana regeneram com o tempo, num ritmo por vocação **fiel ao Crystal Server** (mago regenera mais mana; knight mais vida). É lento de propósito — é o número real do Tibia, não um ritmo idle acelerado.
- **Promoção dobra a regeneração** ociosa de HP e Mana — é o principal benefício mecânico da promoção.

## Rook e graduação (nível 8)
- O personagem começa numa fase inicial (estilo Rook/Dawnport) com a vocação escolhida na criação como **provisória** e um kit inicial.
- Enquanto provisório, ele **treina skills no ritmo neutro** (o mais lento), não no ritmo da vocação escolhida.
  **Por quê:** sem isso, dava para farmar Magic Level barato como sorcerer e depois graduar knight levando o ML alto de brinde. A vantagem de ritmo da vocação só vale depois do compromisso.
- **No nível 8 o jogador gradua:** confirma a vocação ou troca por outra, e recebe o **kit de graduação** para encarar o continente. Trocar de vocação limpa as magias/runas armadas que a nova vocação não pode lançar.
- A graduação é decidida **pelo servidor** (fonte de verdade do combate): o cliente só reflete o que ele confirmou.

## Promoção (nível 20)
- A partir do nível 20, pagando um custo em gold, a vocação vira a versão promovida (Elite Knight / Royal Paladin / Master Sorcerer / Elder Druid).
- Benefício: **regeneração de HP/mana dobrada** e teto de soul points maior (ver abaixo). O nome exibido passa a ser o título de elite.

## Morte e penalidade
- Morrer custa uma fração da **XP total** (pode até baixar de nível, como no Tibia) e faz reviver com parte do HP máximo. A fração segue a **fórmula real do Crystal Server** (≈10% em níveis baixos, caindo com o nível).
- **Bênçãos** reduzem a perda (cada bênção corta um pedaço) e melhoram o HP ao reviver; **promoção** reduz mais. Sem bênção, a morte dói o máximo.
- A penalidade é sempre leve, nunca catastrófica — mantém o tom idle-friendly.

## Bênçãos (Blessings)
- Até 5 bênçãos, compradas com gold. O preço **escala com o nível** (ralo de gold relevante no fim do jogo).
- São **consumidas ao morrer** — é preciso recomprar. Segurar as 5 concede uma conquista.

## Soul Points
- Segunda moeda de conjuração. Teto de 100 (200 se promovido). Só regenera **com o tempo** (mais rápido se promovido); não há ganho por matar criatura.
- Toda magia que fabrica item (munição do paladino, runas dos magos) custa mana **e** soul — é o que impede virar uma fábrica infinita de runas.

## Stamina (opcional)
- Recurso em minutos, com teto de 42h, que **só tem efeito se o operador ligar** no painel.
- Cai caçando e regenera descansando. Abaixo de 14h, a XP cai pela metade — incentiva descanso, como no Tibia. Nunca zera a XP.

## Regras de negócio
- Vocação graduada é permanente; nível nunca causa perda de progresso além da penalidade de morte definida.
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
