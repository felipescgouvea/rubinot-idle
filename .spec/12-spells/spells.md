# Spells (Livro de Magias)

## Objetivo
Dar a cada vocação o **livro de magias real do Tibia** — ataque, cura, suporte, conjuração e utilitárias — com palavras mágicas, nível mínimo, custo e efeito fiéis, para que o jogador reconheça e escolha suas magias como no original. As magias de ataque e cura alimentam a automação do RTC (ver [11-rtc/](../11-rtc/rtc.md)).

## Quem usa
Todo jogador, para consultar o que sua vocação pode lançar e a partir de que nível. A aba **Spells** é o livro; o **RTC** é onde ele escolhe quais usar automaticamente.

## O que o usuário precisa conseguir fazer
- Ver todas as magias da sua vocação, separadas por tipo, com palavras mágicas, nível mínimo, custo de mana (e soul, quando houver) e cooldown.
- Entender o efeito de cada magia (dano e elemento, cura, buff, o que conjura).
- Ver como cada magia escala (Magic Level, skill de arma ou distância).

## Categorias de magia (fiéis ao Tibia)
- **Ataque** — dano imediato. Cada uma tem um **elemento** (físico, fogo, gelo, energia, terra, morte, sagrado) e uma **forma de área**: alvo único, feixe (beam), onda em cone (wave), quadrado 3×3 ou área gigante (ball). Ver [10-caca/areas-de-ataque.md](../10-caca/areas-de-ataque.md).
- **Dano contínuo** (as "utori") — não dão dano na hora: aplicam uma condição que fere a criatura por vários segundos.
- **Cura** — recuperam HP. Cada vocação tem suas curas (o knight tem as próprias, os demais partem de Light Healing).
- **Suporte / buff** — mudam o personagem por um tempo (escudo de mana, mais dano, haste, regeneração, provocar).
- **Conjuração** — fabricam item (munição do paladino, runas dos magos). Custam mana **e** soul; runas ainda consomem uma Blank Rune de reagente.
- **Utilitárias** — luz, encontrar pessoa, corda, invocar, magias de grupo. Existem no livro como no Tibia, mas sem efeito na caçada solo — a interface diz isso em vez de fingir um bônus.

## Regras de negócio
- **Toda magia é real do Tibia** — nome, palavras mágicas, nível mínimo, custo, cooldown e coeficiente de dano/cura vêm da fonte oficial (Crystal Server / TibiaWiki). Nada é inventado nem aproximado de memória.
  **Por quê:** o reconhecimento imediato ("exori", "exura vita", "avalanche") é parte central da promessa do produto.
- Uma magia só fica disponível quando a vocação tem acesso a ela **e** o personagem atingiu o nível mínimo.
- O dano/cura é um valor aleatório entre um mínimo e um máximo que **escalam com o atributo certo da vocação**: Magic Level (padrão), skill de arma corpo a corpo (magias físicas do knight) ou Distance Fighting (magias do paladino). Some sempre um piso proporcional ao nível.
- Enquanto a magia está em cooldown, o RTC não a repete — nesse intervalo o personagem dá o golpe básico da arma.
- As vocações têm curas de nível 1 (fase inicial) para nunca ficarem sem opção de cura antes do nível 8.

## Comportamento esperado
- O livro mostra todas as magias da vocação; as de nível acima do atual aparecem bloqueadas até o jogador chegar lá.
- Magias utilitárias sem efeito em combate são marcadas como tal, sem prometer dano/cura.
- Conjurar sem soul suficiente (ou sem Blank Rune, no caso das runas) não produz o item.

## Critérios de aceitação
- [ ] Cada vocação vê apenas as magias que pode lançar, com palavras mágicas e nível mínimo reais.
- [ ] O dano/cura de cada magia escala pelo atributo correto da vocação e respeita o cooldown.
- [ ] Magias de conjuração debitam mana e soul (e Blank Rune quando aplicável) e entregam a quantidade correta de itens.
- [ ] Magias utilitárias sem efeito em combate são exibidas como conhecidas, sem simular dano/cura.
- [ ] Nenhuma magia, valor ou palavra mágica é inventada — todas rastreáveis à fonte oficial.
