# Spells (Livro de Magias)

## Objetivo
Dar a cada vocação o **livro de magias real do Tibia**, com palavras mágicas, nível mínimo, custo e efeito fiéis. As magias de ataque e cura alimentam a automação do RTC (ver [11-rtc/](../11-rtc/rtc.md)).

Este arquivo é a **visão geral**. Cada magia é detalhada em seu próprio arquivo, nas subpastas por vocação.

## Quem usa
Todo jogador, para consultar o que sua vocação pode lançar e a partir de que nível. A aba **Spells** é o livro; o **RTC** é onde escolhe quais usar automaticamente.

## Como as magias se dividem
- **Por vocação** — cada vocação tem seu conjunto. Ver [knight/](knight/), [paladin/](paladin/), [sorcerer/](sorcerer/), [druid/](druid/) e as compartilhadas em [shared/](shared/).
- **Por tipo:**
  - **Ataque** — dano imediato, com **elemento** (físico, fogo, gelo, energia, terra, morte, sagrado) e uma **forma de área** (ver [10-caca/areas-de-ataque.md](../10-caca/areas-de-ataque.md)).
  - **Cura** — recuperam HP.
  - **Suporte / buff** — mudam o personagem por um tempo (escudo de mana, mais dano, haste, regeneração, provocar).
  - **Conjuração** — fabricam item (munição do paladino, runas dos magos); custam mana **e** soul, e runas consomem uma Blank Rune.
  - **Utilitárias** — luz, encontrar pessoa, corda, invocar, magias de grupo. Existem no livro como no Tibia, mas sem efeito na caçada solo.

## Regras de negócio
- **Toda magia é real do Tibia** — nome, palavras mágicas, nível mínimo, custo, cooldown e coeficiente de dano/cura vêm da fonte oficial (Crystal Server / TibiaWiki). Nada inventado nem aproximado de memória — o reconhecimento imediato ("exori", "exura vita", "avalanche") é parte central da promessa do produto.
- Uma magia só fica disponível quando a vocação tem acesso a ela **e** o personagem atingiu o nível mínimo.
- O dano/cura é aleatório entre mínimo e máximo que **escalam com o atributo certo da vocação**: Magic Level (padrão), skill de arma corpo a corpo (magias físicas do knight) ou Distance Fighting (magias do paladino). Sempre com um piso proporcional ao nível.
- Enquanto em cooldown, o RTC não repete a magia — nesse intervalo o personagem dá o golpe básico.
- As vocações têm curas de nível 1 para nunca ficarem sem opção antes do nível 8.

## Comportamento esperado
- O livro mostra todas as magias da vocação; as de nível acima do atual aparecem bloqueadas.
- Magias utilitárias sem efeito em combate são marcadas como tal, sem prometer dano/cura.
- Conjurar sem soul (ou sem Blank Rune, no caso das runas) não produz o item.

## Critérios de aceitação
- [ ] Cada vocação vê apenas as magias que pode lançar, com palavras mágicas e nível mínimo reais.
- [ ] O dano/cura de cada magia escala pelo atributo correto da vocação e respeita o cooldown.
- [ ] Magias de conjuração debitam mana e soul (e Blank Rune quando aplicável) e entregam a quantidade correta de itens.
- [ ] Magias utilitárias sem efeito em combate são exibidas como conhecidas, sem simular dano/cura.
- [ ] Nenhuma magia, valor ou palavra mágica é inventada — todas rastreáveis à fonte oficial.
