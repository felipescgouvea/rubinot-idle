# Fórmulas de combate por vocação (referência técnica)

Documento de apoio à **auditoria por vocação** do [TODO](../TODO.md). Descreve o
que cada vocação usa hoje no jogo e a intenção de fidelidade ao Tibia. As
funções vivem em `src/domain/combatFormulas.js` e a orquestração em
`src/application/huntUseCases.js`.

> Aproximações deliberadas: os números não são os exatos do CipSoft, mas seguem
> a mesma lógica (guerreiro escala com arma+skill; mago com Magic Level; etc.).

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

- **Físicas** (Berserk/Groundshaker/Ethereal Spear): `calcDamage(atk, defAlvo) × power`
  — escalam com a arma; sofrem redução por defesa.
- **Elementais** (fogo/gelo/energia/terra/sagrado): `(nível·0.4 + ML·2.0) × power`
  — escalam com nível+ML; **não** sofrem defesa física, e sim o **modificador
  elemental** do alvo (`domain/elements.js`).

Cada magia só aparece/casta pra vocações em `spell.voc` (RTC + combate filtram
por `isSpellAvailable`).

## Cura por magia (`spellHealAmount`)

`(nível·1.2 + ML·6) × power × 6` — escala com nível+ML. Knight, com ML baixíssimo,
cura pouco e depende de poção (fiel ao Tibia).

## Runas (`runeDamage` + gate por ML)

- Dano: `rune.dmg × max(0.4, 1 + (ML-20)·0.03)` — escala com Magic Level.
- Uso: exige a **vocação** (knight nunca — runa não rende sem ML) **E** o
  `reqMl` mínimo da runa (`canUseAttackRune`). Vale no RTC E no uso manual.

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
