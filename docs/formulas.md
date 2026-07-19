# Fórmulas de combate (referência técnica)

Todo o dano de combate segue **à risca o source do The Forgotten Server**
(otland/forgottenserver). As funções puras vivem em
`src/domain/combatFormulas.js`; o combate real (servidor-autoritativo) roda em
`server/src/huntEngine.js` (`resolveTick`). Cada fórmula abaixo cita o arquivo
C++ de origem.

## Primitivas de aleatoriedade (`src/tools.cpp`)

- **`uniformRandom(min,max)`** — inteiro uniforme em `[min,max]`.
- **`normalRandom(min,max)`** — `normal_distribution<float>(0.5, 0.25)` reamostrada
  até cair em `[0,1]`, mapeada linearmente pra `[min,max]`. O dano tende ao
  **meio** da faixa (média comum, extremos raros). É a distribuição usada em
  **todo** rolo de dano no TFS (arma, melee de monstro, magia, runa).

## Golpe básico do jogador (`WeaponMelee/Distance/Wand::getWeaponDamage`)

O dano final é `normalRandom(0, max)` (melee) — o `max` vem de
`Weapons::getMaxWeaponDamage` (`src/weapons.cpp`):

```
max = round( nível/5 + (((skill/4 + 1) · (ataque/3)) · 1.03) / attackFactor )
```

`nível/5` é divisão inteira. `attackFactor = 1.0` (modo ofensivo — o único do
jogo). Por vocação:

| Vocação | ataque | skill | dano |
|---|---|---|---|
| Knight | ataque da **arma** equipada (sword/axe/club), ou 7 (Fist) | skill da arma | `normalRandom(0, max)` |
| Paladin | ataque da **munição** + ataque do **arco** (arco soma no ataque, não na skill) | Distance | `normalRandom(ceil(nível·0.2), max)` |
| Sorcerer/Druid | — (wand tem dano fixo) | — | `normalRandom(min, max)` fixo do cajado (≈ wandDmg ±40%), **sem** escala por ML |

Só a **arma/munição/wand** conta pro ataque — elmo/armadura/anel não somam
(fiel ao Tibia).

## Redução de dano no alvo (`Creature::blockHit`, `src/creature.cpp`)

Aplicada só a dano **FÍSICO** (melee/distância). Elemental (fogo/energia/gelo/
terra/morte/sagrado) **ignora** armadura — só resistência do alvo reduz
(`domain/elements.js`, aplicada por fora).

```
defesa (bloqueio de escudo): dano -= uniformRandom(defesa/2, defesa)
armadura > 3:                dano -= uniformRandom(arm/2, arm-(arm%2+1))
armadura 1..3:               dano -= 1
```

- **Armadura do jogador** (`Player::getArmor`): soma o `def` das peças de corpo
  (elmo/armadura/pernas/botas/anel). **Não** inclui escudo nem arma.
- **Defesa do jogador** (`Player::getDefense`, parte de escudo):
  `(shielding/4 + 2.23) · defEscudo · 0.15 · defenseFactor` (`defenseFactor = 1.0`).
  Sem escudo equipado, não há bloqueio de defesa.
- **Monstro**: `monster.def` do bestiário é usado como **armadura** do monstro
  na redução do golpe do jogador.

## Ataque do monstro (`rollMonsterAttack`)

`monster.atk` do bestiário é o dano **MÁXIMO de melee** (equivale a um monstro
TFS com melee `min=0 max=-atk`):

- **Melee** (físico): `normalRandom(0, atk)`, reduzido por armadura+defesa do
  jogador.
- **Magia** (50% de chance se o monstro tiver `spells`, mantendo a cadência de
  um ataque por tick): `normalRandom(min, max)` do elemento. Físico reduz por
  armadura; elemental passa direto.

> Consequência importante do rolo real: como o dano é `normalRandom(0, max)`
> (média ≈ max/2) **e** armadura/defesa agora reduzem de verdade o físico, um
> personagem bem equipado sofre muito menos dano físico (a ameaça vira o dano
> **elemental**, como no Tibia). Kills também ficam mais lentas que na fórmula
> antiga (que dava quase sempre o máximo). Ajuste as taxas de XP/gold no Painel
> Admin se quiser compensar — a **matemática** de combate agora é fiel.

## Magias e runas (`levelMagicRoll` / `spellAttackDamage` / `runeDamage`)

Fórmula real do TFS (scripts Lua de `data/scripts/spells`), com o `power` de
cada magia/runa `[aMin, baseMin, aMax, baseMax]`:

```
min = nível/5 + X·aMin + baseMin
max = nível/5 + X·aMax + baseMax
dano = normalRandom((int)min, (int)max)
```

`X` = Magic Level (padrão), ou `skill·ataque` (físicas melee: Berserk/
Groundshaker/Fierce Berserk), ou skill de distância (Ethereal Spear). O
modificador elemental do alvo é aplicado por cima. Cada magia só casta pras
vocações em `spell.voc` (`isSpellAvailable`).

Cura por magia (`spellHealAmount`): mesma fórmula, escalando com nível + ML.

## Morte (com bênçãos)

- Perde `deathXpLossPct(bênçãos)` do XP: 5% base → 1% com as 5 bênçãos.
- Revive com `reviveHpPct(bênçãos)`: 30% base → 60% com as 5.
- Bênçãos são consumidas ao morrer.

## Fora de escopo desta referência

- **Arena (PvP)** usa um cálculo próprio simplificado (`arenaUseCases.js`), não
  este caminho.
- **Preview do cliente**: a linha "X te acertou em N" mostra o dano REAL (delta
  de HP do servidor); a *tag* de elemento ao lado ainda é um sorteio cosmético
  (não reflete o golpe exato). Não afeta o dano, só o rótulo.
