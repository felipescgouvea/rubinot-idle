# Áreas de Ataque

## Objetivo
Reproduzir a **forma de área** de cada ataque do Tibia — alvo único, feixe, onda, explosão, quadrado e área gigante — para que magias, runas e munição acertem mais de uma criatura da sala, como no original.

## Quem usa
Todo jogador (indireto): a forma decide quantas criaturas cada ataque acerta. Aparece na descrição das magias/runas e no efeito visual.

## O que o usuário precisa entender
- Ataques de **alvo único** só acertam a criatura da frente; ataques de **área** acertam também as de trás.
- A escolha entre alvo único e área é automatizada pelo RTC conforme o tamanho da sala.

## Regras de negócio
Cada ataque tem uma forma, traduzida em quantas criaturas acerta de uma vez:

- **Alvo único** — só a criatura da frente (golpe normal, strikes, Sudden Death, missiles, Fireball).
- **Feixe (beam)** — linha reta a partir do conjurador (Ethereal Spear, Energy Beam).
- **Onda (wave)** — cone à frente (Fire/Energy/Terra Wave, Front Sweep).
- **Explosão** — área compacta ao redor do alvo (Explosion Rune).
- **Quadrado** — casas ao redor do conjurador (Berserk, Fierce Berserk).
- **Área gigante (ball)** — losango grande, muitas casas (Groundshaker, Divine Caldera, Avalanche, Great Fireball, Hell's Core, Eternal Winter, Rage of the Skies, Wrath of Nature).

Regras:
- A forma vem da **fonte real do Tibia** para cada magia/runa/munição — nada inventado. Munição elemental (Burst Arrow explode em área; flechas elementais causam dano do elemento) carrega a própria forma e elemento.
- Um ataque nunca acerta mais criaturas do que existem na sala.
- O RTC prefere área quando há criaturas suficientes e alvo único quando há poucas (ver [../11-rtc/rtc.md](../11-rtc/rtc.md)) — magia de área num bicho só desperdiça mana/carga; single numa sala cheia perde dano.

## Comportamento esperado
- O efeito visual reflete a forma (uma onda parece onda, uma bola cobre a sala).
- Ataque de área mostra dano em várias criaturas no mesmo golpe.

## Critérios de aceitação
- [ ] Ataques de alvo único acertam só a criatura da frente.
- [ ] Ataques de área acertam várias criaturas, até o limite da forma e do tamanho da sala.
- [ ] A forma de cada magia/runa/munição corresponde à do Tibia real.
- [ ] O RTC alterna entre área e alvo único conforme o tamanho da sala.
