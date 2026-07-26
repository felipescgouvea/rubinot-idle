# Áreas de Ataque

## Objetivo
Reproduzir, no combate contra uma sala de criaturas, a **forma de área** de cada ataque do Tibia — alvo único, feixe, onda, explosão, quadrado e área gigante — para que magias, runas e munição de área acertem mais de uma criatura, como no original.

## Quem usa
Todo jogador (indireto): a forma de cada ataque decide quantas criaturas ele acerta. Aparece na descrição das magias/runas e no efeito visual do combate.

## O que o usuário precisa entender
- Que ataques de **alvo único** só acertam a criatura da frente, e ataques de **área** acertam também as que esperam atrás.
- Que a escolha entre alvo único e área é automatizada pelo RTC conforme o tamanho da sala.

## Regras de negócio
Cada ataque tem uma forma, traduzida em quantas criaturas da sala acerta de uma vez:

- **Alvo único** — só a criatura da frente (golpe normal, strikes, Sudden Death, missiles, Fireball).
- **Feixe (beam)** — linha reta a partir do conjurador (Ethereal Spear, Energy Beam).
- **Onda (wave)** — cone à frente (Fire/Energy/Terra Wave, Front Sweep).
- **Explosão** — área compacta ao redor do alvo (Explosion Rune).
- **Quadrado** — as casas ao redor do conjurador (Berserk, Fierce Berserk).
- **Área gigante (ball)** — losango grande, cobre muitas casas (Groundshaker, Divine Caldera, Avalanche, Great Fireball, Hell's Core, Eternal Winter, Rage of the Skies, Wrath of Nature).

Regras:
- A forma vem da **fonte real do Tibia** para cada magia/runa/munição — nada inventado. Munição elemental (Burst Arrow explode em área; flechas elementais causam dano do elemento) carrega a própria forma e elemento.
- Um ataque nunca acerta mais criaturas do que existem na sala.
- O RTC prefere ataque de área quando há criaturas suficientes e alvo único quando há poucas (ver [../11-rtc/rtc.md](../11-rtc/rtc.md)).
  **Por quê:** gastar uma magia de área num bicho só é desperdício de mana/carga; bater single numa sala cheia perde dano.

## Comportamento esperado
- O efeito visual do ataque reflete a forma (uma onda parece onda, uma bola cobre a sala).
- Ataque de área mostra dano em várias criaturas no mesmo golpe.

## Critérios de aceitação
- [ ] Ataques de alvo único acertam só a criatura da frente.
- [ ] Ataques de área acertam várias criaturas da sala, até o limite da forma e do tamanho da sala.
- [ ] A forma de cada magia/runa/munição corresponde à do Tibia real.
- [ ] O RTC alterna entre área e alvo único conforme o tamanho da sala.
