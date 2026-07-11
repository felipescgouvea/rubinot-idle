# Áreas de Ataque

## Objetivo

Fazer com que cada forma de atacar tenha um **alcance de área** próprio, como no Tibia: alguns ataques acertam só uma criatura, outros atingem várias de uma vez. Assim a escolha de arma, magia ou runa passa a importar não só pelo dano, mas por **quantos inimigos** ela alcança — recompensando quem monta um estilo de combate em área quando a caçada tem muitas criaturas juntas.

## Quem usa

O jogador, ao configurar seu ataque automático (magia ou runa) no RTC, ao usar uma runa mirada manualmente, e ao caçar em zonas onde as criaturas aparecem em grupo.

## Conceito

Durante a caçada, as criaturas surgem em **grupos** (uma "sala"). O jogador enfrenta o grupo pela frente, uma criatura de cada vez. Um ataque de **alvo único** fere apenas a criatura da frente; um ataque de **área** fere a da frente **e** as que estão esperando atrás, até o limite da forma daquele ataque.

Só a criatura da frente revida. Por isso um grupo cheio significa **mais recompensa disponível**, não mais perigo simultâneo — e um ataque de área limpa o grupo muito mais rápido do que um golpe de alvo único, que precisa abater um por um.

## O que o jogador precisa conseguir fazer

- Ver, na hora de escolher a magia ou runa de ataque, se ela é **alvo único** ou de **área** (e qual a forma da área).
- Perceber no registro de combate quando um ataque acertou **várias criaturas** de uma vez.
- Escolher entre eficiência em área (limpar grupos) e foco em alvo único (concentrar dano num inimigo forte).

## Formas de área (referência Tibia)

Cada ataque tem uma forma. As formas, do menor para o maior alcance:

| Forma | Alcance | Exemplos reais de Tibia |
|---|---|---|
| **Alvo único** | 1 criatura | Golpe corpo-a-corpo normal, tiro de flecha, Strikes (Flame/Energy/Ice Strike), Sudden Death, Divine Missile, Ethereal Spear |
| **Onda** | até 5 criaturas | Fire Wave, Energy Wave, Terra Wave, Ice Wave |
| **Explosão** | até 5 criaturas | Explosion, Fireball |
| **Área 3x3** | até 8 criaturas | Berserk (exori), Fierce Berserk, Groundshaker, Divine Caldera, Hell's Core, Eternal Winter, Avalanche, Great Fireball |

O limite de criaturas atingidas é sempre restringido pelo tamanho real do grupo presente: um ataque de área 3x3 num grupo de 3 criaturas atinge as 3.

## Regras de negócio

1. **O ataque básico é sempre alvo único.** O golpe corpo-a-corpo do knight, o tiro de flecha do paladino e o golpe arcano básico do mage ferem apenas a criatura da frente. Isto é fiel ao Tibia — a área vem sempre de uma **magia** ou **runa**, nunca do golpe comum.
   - *Por quê:* diferenciar claramente "bater" de "conjurar em área", que é a decisão tática central do Tibia.

2. **As flechas do paladino são alvo único.** No Tibia, munição de distância acerta um alvo. O paladino obtém ataque em área através de magia (Divine Caldera) ou de runas de área (Avalanche, Great Fireball), não das flechas.
   - *Por quê:* manter a fidelidade — não existe flecha de área no jogo real.

3. **Cada criatura atingida por uma área sofre seu próprio dano.** O respingo não é uma fração dividida: cada alvo recebe um dano calculado contra a defesa dele, como se o ataque tivesse acertado cada um individualmente.
   - *Por quê:* é assim que a área funciona no Tibia — todos os alvos na área levam o golpe cheio.

4. **Bônus por criatura continuam valendo em área.** Se o jogador tem Presa ou Charm ativo contra uma das criaturas atingidas pelo respingo, o bônus se aplica àquela criatura especificamente.

5. **Um único ataque pode matar várias criaturas.** Quando uma área abate mais de uma criatura no mesmo golpe, todas rendem XP, gold e loot normalmente.

6. **Runa de área jogada manualmente respeita a área.** Usar uma Avalanche mirando o grupo atinge a área, igual ao ataque automático — não vira alvo único só por ser manual.

7. **Custo pago uma vez.** Um ataque de área gasta a mesma mana (magia) ou a mesma unidade (runa) que gastaria contra um alvo só — o benefício da área é acertar mais inimigos pelo mesmo custo.

## Comportamento esperado

- Grupo com uma só criatura: ataque de área se comporta como alvo único (não há em quem respingar).
- Criatura da frente sobrevive, mas uma de trás morre pelo respingo: a da frente continua o combate normalmente no próximo golpe.
- Criatura da frente e outras morrem no mesmo golpe: todas são contabilizadas; o combate segue para a próxima criatura viva do grupo (ou volta a procurar, se o grupo acabou).

## Critérios de aceitação

- [ ] Ao escolher a magia/runa de ataque, o jogador vê se é alvo único ou de área e qual a forma.
- [ ] O golpe básico (sem magia/runa) atinge só uma criatura, em qualquer vocação.
- [ ] Uma magia de área (ex.: Berserk, Divine Caldera, Eternal Winter, Hell's Core) atinge várias criaturas do grupo num golpe só.
- [ ] Uma runa de área (Avalanche, Great Fireball, Explosion, Fireball) atinge várias criaturas, tanto no ataque automático quanto jogada manualmente.
- [ ] Sudden Death, Strikes, Divine Missile, Ethereal Spear e as flechas continuam alvo único.
- [ ] Cada criatura atingida em área sofre dano próprio e, ao morrer, rende XP/gold/loot.
- [ ] O registro de combate indica quando um ataque acertou mais de uma criatura.
- [ ] Um ataque de área não custa mais mana/runa do que custaria contra um alvo único.
