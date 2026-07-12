# Fórmulas de combate por vocação (referência técnica)

Documento de apoio à **auditoria por vocação** do [TODO](../TODO.md). Descreve o
que cada vocação usa hoje no jogo e a intenção de fidelidade ao Tibia. As
funções vivem em `src/domain/combatFormulas.js` e a orquestração em
`src/application/huntUseCases.js`.

> **Base power (magias e runas):** o dano/cura usa a **fórmula real do Tibia/TFS**.
> Cada magia/runa tem 4 coeficientes `power: [aMin, baseMin, aMax, baseMax]` (o
> "base power"), extraídos dos scripts oficiais do TFS. O valor é aleatório
> uniforme entre `min` e `max`, onde `min = nível/5 + aMin·X + baseMin` (idem
> `max`), e `X` = Magic Level (padrão), ou `skill·ataque` (físicas melee), ou
> skill de distância (Ethereal Spear). Ver `levelMagicRoll` em `combatFormulas.js`.

## Ataque derivado (`computeAtk`)

| Vocação | Fonte do ataque | Fórmula (aprox.) |
|---|---|---|
| Knight | arma melee (sword/axe/club) + skill da arma | `0.09 · atkArma · (skill+5) + nível/4` |
| Paladin | munição (flecha/dardo) + Distance | `0.09 · atkMunição · (dist+5) + nível/4` |
| Sorcerer/Druid | Magic Level + dano-base da wand/rod | `ML·2.5 + wandDmg·(1 + ML·0.03) + nível/4` |

Só a **arma/munição/wand** conta pro ataque — elmo/armadura/anel não somam
(fiel ao Tibia). A **arma errada não pode ser equipada** (`canVocationEquip`).

## Golpe básico (auto-ataque, todo tick)

- **Knight/Paladin:** `calcDamage(atk, defAlvo)` (arma). Paladino gasta munição se
  o consumo estiver ligado no Admin.
- **Mago (wand/rod):** `calcDamage(atk, defAlvo) × 0.5` — **poke fraco** de propósito
  (calibração): o dano do mago vem das magias, não do cajado grátis.

## Magia de ataque (`spellAttackDamage`)

Fórmula do Tibia `random(min, max)` com o base power da magia (ver acima):

- **Físicas melee** (`scale:'melee'` — Berserk/Groundshaker/Fierce Berserk):
  `X = skill·ataqueArma`. Ex.: Berserk = `nível/5 + skill·atk·0.03 + 7` … `·0.05 + 11`.
- **Física de distância** (`scale:'distance'` — Ethereal Spear): `X = skill de distância`.
- **Elementais/holy** (fogo/gelo/energia/terra/sagrado): `X = Magic Level`.
  Ex.: Energy Wave = `nível/5 + ML·4.5 + 20` … `ML·7.6 + 48`.

O **modificador elemental** do alvo (`domain/elements.js`) é aplicado por cima do
resultado. Cada magia só casta pras vocações em `spell.voc` (`isSpellAvailable`).

## Cura por magia (`spellHealAmount`)

Mesma fórmula do Tibia com o base power da cura. Ex.: Ultimate Healing =
`nível/5 + ML·6.8 + 42` … `ML·12.9 + 90`. Knight (ML baixíssimo) cura pouco.

## Runas (`runeDamage` + gate por ML)

- Dano: **mesma fórmula do Tibia** com o `rune.power` real (ex.: Sudden Death =
  `nível/5 + ML·4.3 + 32` … `ML·7.4 + 48`). Vale no RTC **e** no uso manual.
- Uso: exige a **vocação** (knight nunca — runa não rende sem ML) **E** o
  `reqMl` mínimo da runa (`canUseAttackRune`).

| Runa | reqMl |
|---|---|
| Fireball | 4 |
| Great Fireball | 7 |
| Avalanche | 9 |
| Explosion | 6 |
| Sudden Death | 15 |

## Morte (com bênçãos)

- Perde `deathXpLossPct(bênçãos)` do XP: 5% base → 1% com as 5 bênçãos.
- Revive com `reviveHpPct(bênçãos)`: 30% base → 60% com as 5.
- Bênçãos são consumidas ao morrer.
