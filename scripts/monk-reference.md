# Monk — dados autoritativos (Crystal Server, bate com TibiaWiki)

Fonte: github.com/zimbadev/crystalserver (OT open-source que já implementou o Monk
da atualização 15.00). Os valores por-nível e regen batem exatamente com o
TibiaWiki (página Monk). Canary/TFS ainda não têm Monk.

## Vocação (data/XML/vocations.xml, id=9 Monk / id=10 Exalted Monk)
- gaincap=25, gainhp=10, gainmana=10  (por nível)
- regen base: 1 hp / 7s, 2 mana / 4s  (gainhpticks=7000, gainmanaticks=4000)
- regen exalted: 1 hp / 5s, 2 mana / 3s
- manamultiplier=1.3  (velocidade de Magic Level)
- soulmax=200 (exalted; base 100 como as outras)
- attackspeed=2000, basespeed=110
- formula: meleeDamage=1.3, distDamage=1.0, defense=1.0, armor=1.0
- mitigation multiplier=1.3 (tanky como knight)
- attack skill = FIST FIGHTING (id 0)

## Multiplicadores de skill (tries pra subir)
skill 0 fist=1.1 · 1 club=1.2 · 2 sword=1.2 · 3 axe=1.2 · 4 distance=1.5 · 5 shielding=1.1 · 6 fishing=1.1
(fist 1.1 = sobe rápido, é a skill de ataque do Monk)

## Magias de ataque (data/scripts/spells/attack/*.lua)
- Tiger Clash      "exori infir nia"  lv 1  · mana 18  · cd 8s · alvo único (range 1)
- Double Jab       "exori pug"        lv 14 · mana 30  · cd 4s · alvo único (range 1)
- Sweeping Takedown "exori mas nia"   lv 60 · mana 195 · cd 8s · ÁREA (sem needTarget)

## Mecânicas próprias do Monk (Harmony / Virtue / Serene) — FASE 2
Sistema de recurso: Builder spells acumulam Harmony, Spender spells gastam.
Virtue dá bônus passivo + cura o membro do grupo com menor % HP. Serene = estado
de poder. Isso exige infra de combate nova (barra de recurso, builder/spender) que
o nosso modelo ainda não tem. Magias de suporte no Crystal:
virtue_of_harmony e cia (data/scripts/spells/support/). Implementar depois.

## Não-Tibia (tuning nosso, como nas outras 4 vocações)
baseHp/baseMana/baseAtk/baseDef/baseMgc/baseSpd e hpRegen/manaRegen são o modelo
tunado do nosso jogo (Tibia não tem "base por vocação" no nível 1). Derivados do
perfil híbrido do Monk (lutador de punho resistente, mana moderada).
