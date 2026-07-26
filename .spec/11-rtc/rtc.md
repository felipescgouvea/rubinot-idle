# RTC — Automação de Combate

## Objetivo
Reproduzir o **RTCaster** do RubinOT: o jogador configura uma vez como o personagem ataca e se cura sozinho durante a caçada. É o coração "idle" do combate — ajusta a estratégia e o jogo executa, sem cliques a cada golpe.

## Quem usa
Todo jogador. A aba **RTC** é a segunda, logo após a caça.

## O que o usuário precisa conseguir fazer
- Montar uma **lista de prioridade de ataque** com até quatro entradas, misturando magias e runas.
- Configurar a **cura automática em degraus**: várias magias de cura, cada uma num limiar de % de HP.
- Definir uma **poção de vida** (emergência) e uma **poção de mana**, cada uma com seu gatilho de %.
- Escolher a **prioridade de alvo** quando há mais de uma criatura.
- Definir a partir de **quantas criaturas** prefere magia/runa de área a alvo único.
- Ligar o **elemento inteligente** (usar o ataque forte contra a fraqueza da criatura).

## Regras de negócio

### Ataque
- A lista mistura **magias e runas** por prioridade; o RTC usa a **primeira entrada pronta** (fora de cooldown e com recurso).
- **Knight nunca usa runa de ataque:** o dano de runa escala com Magic Level, que o knight não treina — sairia dano irrisório.
- Cada runa de ataque exige a **vocação certa** e o **Magic Level mínimo**. A maioria não tem restrição de vocação; as exceções (ex.: Holy Missile, do paladino) seguem a fonte oficial.

### Cura
- Escalonada: lista de degraus `{ magia, % de HP }`. O motor usa o degrau **mais grave** que o HP cruzou (HP em 25% com degraus 70/45/25 usa a cura de 25%) — um gatilho único desperdiça mana ou deixa morrer num pico de dano.
- A **poção de vida** é o degrau de emergência, num limiar mais baixo que as magias.
- A **poção de mana** repõe mana quando cai abaixo do gatilho, para continuar castando.
- Quem nunca abriu o painel continua se curando com a **cura padrão da vocação** num limiar razoável — nunca para de se curar por falta de configuração.

### Alvo e área
- Prioridade de alvo: o da frente, o de menor HP (finalizar), o de maior HP, o mais fraco (menos XP) ou o mais forte.
- A regra de área prefere magia/runa de área quando há pelo menos N criaturas vivas, e alvo único abaixo disso — sem deixar de atacar por falta do tipo preferido.

## Comportamento esperado
- Trocar de vocação (na graduação) descarta as magias/runas armadas que a nova vocação não pode lançar.
- Uma entrada bloqueada (nível insuficiente, sem munição/soul, runa fora da vocação) é ignorada, e o RTC segue para a próxima.
- A configuração de RTC é preferência do jogador; dano e cura são calculados pelo servidor.

## Critérios de aceitação
- [ ] A lista de ataque aceita magias e runas juntas e usa a primeira pronta na ordem de prioridade.
- [ ] Knight não consegue armar runa de ataque.
- [ ] A cura em degraus dispara a magia correta para cada faixa de HP, usando o degrau mais grave cruzado.
- [ ] Poção de vida e poção de mana disparam nos próprios limiares de %.
- [ ] Sem nenhuma configuração, o personagem ainda se cura com a cura padrão da vocação.
- [ ] A prioridade de alvo e a preferência de área alteram a escolha de quem/como atacar.
- [ ] Trocar de vocação limpa as entradas incompatíveis do RTC.
